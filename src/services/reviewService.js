import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

const RATER_SELECT = { select: { id: true, name: true, role: true } };

function toPublicReview(review) {
  return {
    id: review.id,
    raterId: review.raterId,
    rater: review.rater,
    rateeId: review.rateeId,
    context: review.context,
    consultationId: review.consultationId,
    caseId: review.caseId,
    muftiQueryId: review.muftiQueryId,
    overallStars: review.overallStars,
    communication: review.communication,
    expertise: review.expertise,
    value: review.value,
    professionalism: review.professionalism,
    responsiveness: review.responsiveness,
    text: review.text,
    isFlagged: review.isFlagged,
    createdAt: review.createdAt,
  };
}

/**
 * Recomputes LawyerProfile.averageRating/reviewCount from scratch. Called
 * after every review creation targeting a lawyer — reviews are rare enough
 * (gated to once per consultation/case/rater pair) that recomputing beats
 * maintaining a running average.
 */
async function syncLawyerRating(lawyerId) {
  const agg = await prisma.review.aggregate({
    where: { rateeId: lawyerId, isFlagged: false },
    _avg: { overallStars: true },
    _count: true,
  });

  await prisma.lawyerProfile.update({
    where: { userId: lawyerId },
    data: {
      averageRating: agg._avg.overallStars ?? null,
      reviewCount: agg._count,
    },
  });
}

/**
 * Validates the rater/ratee/context combination against the platform's
 * review rules and returns the resolved target ids to persist.
 *
 * Rules (PRD 9.1):
 * - client -> lawyer: after a consultation the client had with that lawyer
 *   reaches APPROVED/COMPLETED (context CONSULTATION), or after a case
 *   between them CLOSES (context CASE).
 * - lawyer -> client: after a case between them CLOSES (context CASE).
 * - lawyer -> mufti: after guidance is given (context GUIDANCE). MuftiQuery
 *   is a Track C model landing later this same wave, so its existence/
 *   ownership can't be validated yet — only the role shape (rater LAWYER,
 *   ratee MUFTI, muftiQueryId present) is enforced here. This path isn't
 *   reachable end-to-end in this environment yet; see caller notes.
 */
async function assertReviewAllowed(rater, ratee, { context, consultationId, caseId, muftiQueryId }) {
  if (rater.role === "CLIENT" && ratee.role === "LAWYER") {
    if (context === "CONSULTATION") {
      if (!consultationId) {
        throw new AppError(400, "consultationId is required for a consultation review.");
      }
      const consultation = await prisma.consultation.findUnique({ where: { id: consultationId } });
      if (
        !consultation ||
        consultation.clientId !== rater.id ||
        consultation.lawyerId !== ratee.id
      ) {
        throw new AppError(404, "Consultation not found.");
      }
      if (!["APPROVED", "COMPLETED"].includes(consultation.status)) {
        throw new AppError(400, "You can only review a lawyer after an approved consultation.");
      }
      return { consultationId, caseId: null, muftiQueryId: null };
    }

    if (context === "CASE") {
      if (!caseId) {
        throw new AppError(400, "caseId is required for a case review.");
      }
      const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
      if (!caseRecord || caseRecord.clientId !== rater.id || caseRecord.lawyerId !== ratee.id) {
        throw new AppError(404, "Case not found.");
      }
      if (caseRecord.status !== "CLOSED") {
        throw new AppError(400, "You can only review a lawyer after the case is closed.");
      }
      return { consultationId: null, caseId, muftiQueryId: null };
    }

    throw new AppError(400, "A client can only review a lawyer via a consultation or a closed case.");
  }

  if (rater.role === "LAWYER" && ratee.role === "CLIENT") {
    if (context !== "CASE" || !caseId) {
      throw new AppError(400, "caseId is required for a lawyer reviewing a client.");
    }
    const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord || caseRecord.lawyerId !== rater.id || caseRecord.clientId !== ratee.id) {
      throw new AppError(404, "Case not found.");
    }
    if (caseRecord.status !== "CLOSED") {
      throw new AppError(400, "You can only review a client after the case is closed.");
    }
    return { consultationId: null, caseId, muftiQueryId: null };
  }

  if (rater.role === "LAWYER" && ratee.role === "MUFTI") {
    if (context !== "GUIDANCE" || !muftiQueryId) {
      throw new AppError(400, "muftiQueryId is required for a lawyer reviewing a Mufti.");
    }
    // MuftiQuery ownership/completion can't be checked yet — see doc comment.
    return { consultationId: null, caseId: null, muftiQueryId };
  }

  throw new AppError(403, "This rater/ratee combination isn't allowed to leave a review.");
}

/**
 * POST /api/reviews — create a rating, enforcing the role/context rules
 * above and blocking duplicates (one review per rater/ratee/target).
 */
export async function createReview(rater, body) {
  const { rateeId, context, overallStars } = body;

  if (rateeId === rater.id) {
    throw new AppError(400, "You cannot review yourself.");
  }

  const ratee = await prisma.user.findUnique({ where: { id: rateeId } });
  if (!ratee) {
    throw new AppError(404, "User to review not found.");
  }

  const targets = await assertReviewAllowed(rater, ratee, body);

  const existing = await prisma.review.findFirst({
    where: {
      raterId: rater.id,
      rateeId,
      context,
      consultationId: targets.consultationId,
      caseId: targets.caseId,
      muftiQueryId: targets.muftiQueryId,
    },
  });
  if (existing) {
    throw new AppError(409, "You have already reviewed this.");
  }

  const review = await prisma.review.create({
    data: {
      raterId: rater.id,
      rateeId,
      context,
      ...targets,
      overallStars,
      communication: body.communication ?? null,
      expertise: body.expertise ?? null,
      value: body.value ?? null,
      professionalism: body.professionalism ?? null,
      responsiveness: body.responsiveness ?? null,
      text: body.text ?? null,
    },
    include: { rater: RATER_SELECT },
  });

  if (ratee.role === "LAWYER") {
    await syncLawyerRating(rateeId);
  }

  return toPublicReview(review);
}

/**
 * GET /api/lawyers/:id/reviews — public, feeds the Phase 2 profile display.
 * Excludes flagged reviews — unlike message flagging (11.2a, private
 * threads only the two participants + admin ever see), a Review is
 * public-facing, so flagging one pulls it from public view while an admin
 * looks at it rather than just marking it for later attention.
 */
export async function listLawyerReviews(lawyerId, { page = 1, limit = 10 } = {}) {
  const where = { rateeId: lawyerId, isFlagged: false };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: { rater: RATER_SELECT },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    reviews: reviews.map(toPublicReview),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * GET /api/admin/reviews/flagged — the moderation queue (11.7).
 */
export async function listFlagged() {
  const reviews = await prisma.review.findMany({
    where: { isFlagged: true },
    include: { rater: RATER_SELECT, ratee: RATER_SELECT },
    orderBy: { createdAt: "desc" },
  });

  return reviews.map((r) => ({ ...toPublicReview(r), ratee: r.ratee }));
}

/**
 * PATCH /api/admin/reviews/:id/moderate — toggles a review's moderation
 * flag (11.2b, the other half of 11.2 alongside message flagging). Re-syncs
 * the ratee's denormalized rating either way, since flagged reviews are
 * excluded from both the public listing and the aggregate.
 */
export async function moderateReview(reviewId) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) {
    throw new AppError(404, "Review not found.");
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: { isFlagged: !review.isFlagged },
    include: { rater: RATER_SELECT, ratee: RATER_SELECT },
  });

  const ratee = await prisma.user.findUnique({ where: { id: review.rateeId } });
  if (ratee?.role === "LAWYER") {
    await syncLawyerRating(review.rateeId);
  }

  return { ...toPublicReview(updated), ratee: updated.ratee };
}

import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

const PARTICIPANT_SELECT = { select: { id: true, name: true, email: true, phone: true } };

function toPublicPayment(payment) {
  return {
    id: payment.id,
    consultationId: payment.consultationId,
    caseId: payment.caseId,
    milestoneId: payment.milestoneId,
    muftiQueryId: payment.muftiQueryId,
    screenshotUrl: payment.screenshotUrl,
    amount: payment.amount,
    status: payment.status,
    reason: payment.reason,
    createdAt: payment.createdAt,
    reviewedAt: payment.reviewedAt,
    consultation: payment.consultation
      ? {
          id: payment.consultation.id,
          client: payment.consultation.client,
          lawyer: payment.consultation.lawyer,
          scheduledAt: payment.consultation.scheduledAt,
          status: payment.consultation.status,
        }
      : null,
    case: payment.case
      ? {
          id: payment.case.id,
          client: payment.case.client,
          lawyer: payment.case.lawyer,
          status: payment.case.status,
        }
      : null,
    muftiQuery: payment.muftiQuery
      ? {
          id: payment.muftiQuery.id,
          lawyer: payment.muftiQuery.lawyer,
          urgency: payment.muftiQuery.urgency,
          status: payment.muftiQuery.status,
        }
      : null,
  };
}

// No real video infra — a plausible-looking Meet link is generated on
// payment approval so the consultation flow (PRD steps 4-6) has somewhere
// to send both parties.
function generateMeetingLink() {
  const segment = (n) => crypto.randomBytes(n).toString("hex").slice(0, n);
  return `https://meet.google.com/${segment(3)}-${segment(4)}-${segment(3)}`;
}

/**
 * GET /api/admin/payments/pending — every payment still awaiting review,
 * across whichever target types currently exist (consultations and cases
 * so far; milestone/mufti-query payments arrive in later phases).
 */
export async function listPendingPayments() {
  const payments = await prisma.payment.findMany({
    where: { status: "PENDING" },
    include: {
      consultation: { include: { client: PARTICIPANT_SELECT, lawyer: PARTICIPANT_SELECT } },
      case: { include: { client: PARTICIPANT_SELECT, lawyer: PARTICIPANT_SELECT } },
      muftiQuery: { include: { lawyer: PARTICIPANT_SELECT } },
    },
    orderBy: { createdAt: "asc" },
  });

  return payments.map(toPublicPayment);
}

/**
 * PATCH /api/admin/payments/:id — approve/reject a pending payment.
 * - Consultation payments: approving flips it to APPROVED and generates a
 *   meeting link; rejecting flips it to REJECTED.
 * - Case (retainer) payments: approving flips the case to ACTIVE — but
 *   only if the client doesn't already have another ACTIVE case (a client
 *   accepting two proposals before either retainer is reviewed is allowed;
 *   only one of them may actually go ACTIVE, so this is the second half of
 *   that guard, alongside proposalService.acceptProposal). Rejecting flips
 *   the case to CLOSED — there's no case-level REJECTED status, and with
 *   no retry flow (matching how a rejected consultation payment works),
 *   a failed retainer simply closes out the case attempt.
 * - Mufti query payments: approving flips the query to PENDING_RESPONSE —
 *   this is what makes it enter the Mufti's shared queue (see
 *   muftiQueryService.listQueue). Rejecting flips it to REJECTED, terminal,
 *   same no-retry pattern as consultations/cases.
 */
export async function reviewPayment(adminId, paymentId, { status, reason }) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    throw new AppError(404, "Payment not found.");
  }
  if (payment.status !== "PENDING") {
    throw new AppError(400, "This payment has already been reviewed.");
  }

  if (payment.caseId && status === "APPROVED") {
    const caseRecord = await prisma.case.findUnique({ where: { id: payment.caseId } });
    const conflictingActiveCase = await prisma.case.findFirst({
      where: { clientId: caseRecord.clientId, status: "ACTIVE", NOT: { id: caseRecord.id } },
    });
    if (conflictingActiveCase) {
      throw new AppError(
        409,
        "This client already has another active case — approve or resolve that one first.",
        "ACTIVE_CASE_EXISTS"
      );
    }
  }

  const updates = [
    prisma.payment.update({
      where: { id: paymentId },
      data: { status, reason: reason ?? null, reviewedById: adminId, reviewedAt: new Date() },
    }),
  ];

  if (payment.consultationId) {
    updates.push(
      prisma.consultation.update({
        where: { id: payment.consultationId },
        data:
          status === "APPROVED"
            ? { status: "APPROVED", meetingLink: generateMeetingLink() }
            : { status: "REJECTED" },
      })
    );
  }

  if (payment.caseId) {
    updates.push(
      prisma.case.update({
        where: { id: payment.caseId },
        data: { status: status === "APPROVED" ? "ACTIVE" : "CLOSED" },
      })
    );
  }

  if (payment.muftiQueryId) {
    updates.push(
      prisma.muftiQuery.update({
        where: { id: payment.muftiQueryId },
        data: { status: status === "APPROVED" ? "PENDING_RESPONSE" : "REJECTED" },
      })
    );
  }

  const [updatedPayment] = await prisma.$transaction(updates);

  return toPublicPayment({
    ...updatedPayment,
    consultation: payment.consultationId
      ? await prisma.consultation.findUnique({
          where: { id: payment.consultationId },
          include: { client: PARTICIPANT_SELECT, lawyer: PARTICIPANT_SELECT },
        })
      : null,
    case: payment.caseId
      ? await prisma.case.findUnique({
          where: { id: payment.caseId },
          include: { client: PARTICIPANT_SELECT, lawyer: PARTICIPANT_SELECT },
        })
      : null,
    muftiQuery: payment.muftiQueryId
      ? await prisma.muftiQuery.findUnique({
          where: { id: payment.muftiQueryId },
          include: { lawyer: PARTICIPANT_SELECT },
        })
      : null,
  });
}

function toPublicVerification(profile, type) {
  return {
    id: profile.userId,
    type,
    name: profile.user.name,
    email: profile.user.email,
    phone: profile.user.phone,
    bio: profile.bio,
    specialization: profile.specialization,
    languages: profile.languages,
    verificationStatus: profile.verificationStatus,
    createdAt: profile.createdAt,
    credentials:
      type === "LAWYER"
        ? {
            barCouncilLicenseUrl: profile.barCouncilLicenseUrl,
            cnicUrl: profile.cnicUrl,
            educationCredentialsUrl: profile.educationCredentialsUrl,
          }
        : { credentialsUrl: profile.credentialsUrl },
  };
}

/**
 * GET /api/admin/verifications/pending — lawyers + Muftis awaiting
 * credential review, merged into one queue ordered oldest-first.
 */
export async function listPendingVerifications() {
  const include = { user: { select: { name: true, email: true, phone: true } } };

  const [lawyers, muftis] = await Promise.all([
    prisma.lawyerProfile.findMany({ where: { verificationStatus: "PENDING_VERIFICATION" }, include }),
    prisma.muftiProfile.findMany({ where: { verificationStatus: "PENDING_VERIFICATION" }, include }),
  ]);

  const combined = [
    ...lawyers.map((p) => toPublicVerification(p, "LAWYER")),
    ...muftis.map((p) => toPublicVerification(p, "MUFTI")),
  ];

  combined.sort((a, b) => a.createdAt - b.createdAt);
  return combined;
}

/**
 * PATCH /api/admin/verifications/:id — approve/reject a lawyer's or
 * Mufti's credentials. `:id` is the profile owner's userId; both profile
 * tables are checked since the route doesn't know the role up front.
 */
export async function reviewVerification(userId, { status, reason }) {
  const include = { user: { select: { name: true, email: true, phone: true } } };

  const lawyerProfile = await prisma.lawyerProfile.findUnique({ where: { userId }, include });
  if (lawyerProfile) {
    if (lawyerProfile.verificationStatus !== "PENDING_VERIFICATION") {
      throw new AppError(400, "This lawyer has already been reviewed.");
    }
    const updated = await prisma.lawyerProfile.update({
      where: { userId },
      data: { verificationStatus: status, verificationReason: reason ?? null },
      include,
    });
    return toPublicVerification(updated, "LAWYER");
  }

  const muftiProfile = await prisma.muftiProfile.findUnique({ where: { userId }, include });
  if (muftiProfile) {
    if (muftiProfile.verificationStatus !== "PENDING_VERIFICATION") {
      throw new AppError(400, "This Mufti has already been reviewed.");
    }
    const updated = await prisma.muftiProfile.update({
      where: { userId },
      data: { verificationStatus: status, verificationReason: reason ?? null },
      include,
    });
    return toPublicVerification(updated, "MUFTI");
  }

  throw new AppError(404, "Verification target not found.");
}

/**
 * PATCH /api/admin/messages/:id/flag — toggles a message's moderation flag
 * (11.2a). The other half of full message moderation (11.2b, a dedicated
 * flagged-content view) needs the Review model and lands later.
 */
export async function toggleMessageFlag(messageId) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) {
    throw new AppError(404, "Message not found.");
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { isFlagged: !message.isFlagged },
  });

  return {
    id: updated.id,
    threadType: updated.threadType,
    threadId: updated.threadId,
    senderId: updated.senderId,
    body: updated.body,
    isFlagged: updated.isFlagged,
    createdAt: updated.createdAt,
  };
}

/**
 * GET /api/admin/messages/flagged — the flagged-message moderation queue
 * (11.7), newest first.
 */
export async function listFlaggedMessages() {
  const messages = await prisma.message.findMany({
    where: { isFlagged: true },
    include: { sender: PARTICIPANT_SELECT },
    orderBy: { createdAt: "desc" },
  });

  return messages.map((m) => ({
    id: m.id,
    threadType: m.threadType,
    threadId: m.threadId,
    sender: m.sender,
    body: m.body,
    isFlagged: m.isFlagged,
    createdAt: m.createdAt,
  }));
}

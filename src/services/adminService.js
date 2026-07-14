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
 * across whichever target types currently exist (only consultations so
 * far; case/milestone/mufti-query payments arrive in later phases).
 */
export async function listPendingPayments() {
  const payments = await prisma.payment.findMany({
    where: { status: "PENDING" },
    include: { consultation: { include: { client: PARTICIPANT_SELECT, lawyer: PARTICIPANT_SELECT } } },
    orderBy: { createdAt: "asc" },
  });

  return payments.map(toPublicPayment);
}

/**
 * PATCH /api/admin/payments/:id — approve/reject a pending payment.
 * Approving flips the linked consultation to APPROVED and generates its
 * meeting link; rejecting flips it to REJECTED so the client can see why
 * and re-pay/re-book.
 */
export async function reviewPayment(adminId, paymentId, { status, reason }) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    throw new AppError(404, "Payment not found.");
  }
  if (payment.status !== "PENDING") {
    throw new AppError(400, "This payment has already been reviewed.");
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

  const [updatedPayment] = await prisma.$transaction(updates);

  return toPublicPayment({
    ...updatedPayment,
    consultation: payment.consultationId
      ? await prisma.consultation.findUnique({
          where: { id: payment.consultationId },
          include: { client: PARTICIPANT_SELECT, lawyer: PARTICIPANT_SELECT },
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

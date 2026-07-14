import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

function toFileUrl(file) {
  return file ? `/api/files/payments/${file.filename}` : null;
}

/**
 * POST /api/payments — a client uploading proof of payment for a
 * consultation booking. Only the consultation's own client may pay for it,
 * and only while it's still awaiting payment. Moves the consultation to
 * PENDING_REVIEW; an admin approves/rejects it in Phase 4, which is also
 * where the meeting link gets generated.
 */
export async function createPayment(clientId, { consultationId }, file) {
  if (!file) {
    throw new AppError(400, "A payment screenshot is required.");
  }

  const consultation = await prisma.consultation.findUnique({ where: { id: consultationId } });
  if (!consultation || consultation.clientId !== clientId) {
    throw new AppError(404, "Consultation not found.");
  }
  if (consultation.status !== "PENDING_PAYMENT") {
    throw new AppError(400, "This consultation isn't awaiting payment.");
  }

  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        consultationId,
        screenshotUrl: toFileUrl(file),
        amount: consultation.fee,
      },
    }),
    prisma.consultation.update({
      where: { id: consultationId },
      data: { status: "PENDING_REVIEW" },
    }),
  ]);

  return {
    id: payment.id,
    consultationId: payment.consultationId,
    screenshotUrl: payment.screenshotUrl,
    amount: payment.amount,
    status: payment.status,
    createdAt: payment.createdAt,
  };
}

import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

const PARTICIPANT_SELECT = { select: { id: true, name: true } };

function toPublicConsultation(consultation) {
  return {
    id: consultation.id,
    client: consultation.client,
    lawyer: consultation.lawyer,
    fee: consultation.fee,
    scheduledAt: consultation.scheduledAt,
    status: consultation.status,
    meetingLink: consultation.meetingLink,
    createdAt: consultation.createdAt,
    payments: consultation.payments?.map((p) => ({
      id: p.id,
      screenshotUrl: p.screenshotUrl,
      amount: p.amount,
      status: p.status,
      reason: p.reason,
      createdAt: p.createdAt,
      reviewedAt: p.reviewedAt,
    })),
  };
}

/**
 * POST /api/consultations — a client booking a paid video consultation
 * with a verified lawyer. Fee is snapshotted from the lawyer's current
 * consultationFee so a later fee change doesn't alter an existing booking.
 */
export async function createConsultation(clientId, { lawyerId, scheduledAt }) {
  if (scheduledAt.getTime() <= Date.now()) {
    throw new AppError(400, "scheduledAt must be in the future.");
  }

  const lawyerProfile = await prisma.lawyerProfile.findUnique({ where: { userId: lawyerId } });
  if (!lawyerProfile || lawyerProfile.verificationStatus !== "VERIFIED") {
    throw new AppError(404, "Lawyer not found.");
  }
  if (lawyerProfile.consultationFee == null) {
    throw new AppError(400, "This lawyer hasn't set a consultation fee yet.");
  }

  const consultation = await prisma.consultation.create({
    data: {
      clientId,
      lawyerId,
      fee: lawyerProfile.consultationFee,
      scheduledAt,
    },
    include: { client: PARTICIPANT_SELECT, lawyer: PARTICIPANT_SELECT, payments: true },
  });

  return toPublicConsultation(consultation);
}

/**
 * GET /api/consultations/mine — scoped to the caller's own bookings,
 * either as the client or as the lawyer.
 */
export async function listMine(user) {
  const where =
    user.role === "CLIENT"
      ? { clientId: user.id }
      : user.role === "LAWYER"
        ? { lawyerId: user.id }
        : null;

  if (!where) {
    throw new AppError(403, "Only clients and lawyers have consultations.");
  }

  const consultations = await prisma.consultation.findMany({
    where,
    include: { client: PARTICIPANT_SELECT, lawyer: PARTICIPANT_SELECT, payments: true },
    orderBy: { scheduledAt: "desc" },
  });

  return consultations.map(toPublicConsultation);
}

/**
 * GET /api/consultations/:id — restricted to the client or lawyer on the
 * booking. 404s (not 403) for a mismatched caller so a consultation ID
 * isn't enumerable.
 */
export async function getById(user, id) {
  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: { client: PARTICIPANT_SELECT, lawyer: PARTICIPANT_SELECT, payments: true },
  });

  if (!consultation || (consultation.clientId !== user.id && consultation.lawyerId !== user.id)) {
    throw new AppError(404, "Consultation not found.");
  }

  return toPublicConsultation(consultation);
}

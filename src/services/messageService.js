import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

const SENDER_SELECT = { select: { id: true, name: true, role: true } };

function toPublicMessage(message) {
  return {
    id: message.id,
    threadType: message.threadType,
    threadId: message.threadId,
    sender: message.sender,
    body: message.body,
    attachmentUrl: message.attachmentUrl,
    createdAt: message.createdAt,
  };
}

/**
 * Resolves a thread to its participants + "paid" gate. Only CONSULTATION
 * threads exist so far — CASE threads arrive with the Case model in
 * Phase 7, so they 400 for now rather than 404 (the type is valid, just
 * not usable yet).
 */
async function resolveThread(threadType, threadId) {
  if (threadType === "CASE") {
    throw new AppError(400, "Case messaging isn't available yet.");
  }
  if (threadType !== "CONSULTATION") {
    throw new AppError(400, "Unknown thread type.");
  }

  const consultation = await prisma.consultation.findUnique({ where: { id: threadId } });
  if (!consultation) {
    throw new AppError(404, "Thread not found.");
  }

  return {
    clientId: consultation.clientId,
    lawyerId: consultation.lawyerId,
    // "No contact until paid" (Phase 5.2) — a consultation only counts as
    // paid once an admin has approved its payment.
    isPaid: consultation.status === "APPROVED" || consultation.status === "COMPLETED",
  };
}

function assertParticipant(user, thread) {
  if (thread.clientId !== user.id && thread.lawyerId !== user.id) {
    throw new AppError(404, "Thread not found.");
  }
}

/**
 * GET /api/threads/:type/:id/messages — restricted to the two participants
 * on the underlying consultation/case.
 */
export async function listMessages(user, threadType, threadId) {
  const thread = await resolveThread(threadType, threadId);
  assertParticipant(user, thread);

  const messages = await prisma.message.findMany({
    where: { threadType, threadId },
    include: { sender: SENDER_SELECT },
    orderBy: { createdAt: "asc" },
  });

  return messages.map(toPublicMessage);
}

/**
 * POST /api/threads/:type/:id/messages — restricted to participants, and
 * further gated on the thread being paid ("no contact until paid").
 */
export async function sendMessage(user, threadType, threadId, { body, attachmentUrl }) {
  const thread = await resolveThread(threadType, threadId);
  assertParticipant(user, thread);

  if (!thread.isPaid) {
    throw new AppError(403, "Messaging unlocks once the payment for this thread is approved.");
  }

  const message = await prisma.message.create({
    data: {
      threadType,
      threadId,
      senderId: user.id,
      body,
      attachmentUrl: attachmentUrl ?? null,
    },
    include: { sender: SENDER_SELECT },
  });

  return toPublicMessage(message);
}

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
 * Resolves a thread to its participants + "paid" gate. CASE threads
 * (Phase 7 / Track B) reuse the same "no contact until paid" gate as
 * CONSULTATION threads: a Case exists in PENDING_PAYMENT until the
 * retainer payment is admin-approved, at which point it flips to ACTIVE
 * (and later CLOSED) — messaging unlocks at that same point.
 */
async function resolveThread(threadType, threadId) {
  if (threadType === "CASE") {
    const caseRecord = await prisma.case.findUnique({ where: { id: threadId } });
    if (!caseRecord) {
      throw new AppError(404, "Thread not found.");
    }
    return {
      clientId: caseRecord.clientId,
      lawyerId: caseRecord.lawyerId,
      isPaid: caseRecord.status === "ACTIVE" || caseRecord.status === "CLOSED",
    };
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

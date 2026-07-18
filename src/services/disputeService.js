import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

const PARTICIPANT_SELECT = { select: { id: true, name: true, email: true, phone: true } };
const DISPUTE_INCLUDE = {
  raisedBy: PARTICIPANT_SELECT,
  case: { include: { client: PARTICIPANT_SELECT, lawyer: PARTICIPANT_SELECT } },
};

function toPublicDispute(dispute) {
  return {
    id: dispute.id,
    caseId: dispute.caseId,
    raisedBy: dispute.raisedBy,
    reason: dispute.reason,
    status: dispute.status,
    resolution: dispute.resolution,
    createdAt: dispute.createdAt,
    resolvedAt: dispute.resolvedAt,
    case: dispute.case
      ? {
          id: dispute.case.id,
          status: dispute.case.status,
          client: dispute.case.client,
          lawyer: dispute.case.lawyer,
        }
      : null,
  };
}

/**
 * POST /api/disputes — a client or lawyer flagging a problem on their own
 * case for admin mediation. Either party on the case may raise it.
 */
export async function createDispute(userId, { caseId, reason }) {
  const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseRecord) {
    throw new AppError(404, "Case not found.");
  }
  if (caseRecord.clientId !== userId && caseRecord.lawyerId !== userId) {
    throw new AppError(403, "You are not a party on this case.");
  }

  const dispute = await prisma.dispute.create({
    data: { caseId, raisedById: userId, reason },
    include: DISPUTE_INCLUDE,
  });

  return toPublicDispute(dispute);
}

/**
 * GET /api/admin/disputes — every dispute, newest first, for the admin
 * moderation queue.
 */
export async function listAll() {
  const disputes = await prisma.dispute.findMany({
    include: DISPUTE_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return disputes.map(toPublicDispute);
}

/**
 * PATCH /api/admin/disputes/:id — admin moves a dispute to IN_REVIEW or
 * closes it out RESOLVED (with a required resolution note). No REJECTED
 * status — every dispute either stays open/in-review or gets resolved,
 * matching the "mediation" framing in the PRD rather than an adversarial
 * approve/reject like payments/verifications.
 */
export async function reviewDispute(disputeId, { status, resolution }) {
  const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
  if (!dispute) {
    throw new AppError(404, "Dispute not found.");
  }
  if (dispute.status === "RESOLVED") {
    throw new AppError(400, "This dispute has already been resolved.");
  }

  const updated = await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      status,
      resolution: resolution ?? dispute.resolution,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
    },
    include: DISPUTE_INCLUDE,
  });

  return toPublicDispute(updated);
}

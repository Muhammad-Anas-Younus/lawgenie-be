import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

const PARTICIPANT_SELECT = { select: { id: true, name: true } };
const PROPOSAL_INCLUDE = {
  lawyer: PARTICIPANT_SELECT,
  client: PARTICIPANT_SELECT,
  case: { select: { id: true, status: true } },
};

function toFileUrl(file) {
  return file ? `/api/files/payments/${file.filename}` : null;
}

function toPublicProposal(proposal) {
  return {
    id: proposal.id,
    consultationId: proposal.consultationId,
    lawyer: proposal.lawyer,
    client: proposal.client,
    feeStructure: proposal.feeStructure,
    status: proposal.status,
    createdAt: proposal.createdAt,
    case: proposal.case ?? null,
  };
}

function toPublicCase(caseRecord, payment) {
  return {
    id: caseRecord.id,
    proposalId: caseRecord.proposalId,
    clientId: caseRecord.clientId,
    lawyerId: caseRecord.lawyerId,
    status: caseRecord.status,
    createdAt: caseRecord.createdAt,
    payment: {
      id: payment.id,
      screenshotUrl: payment.screenshotUrl,
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt,
    },
  };
}

/**
 * POST /api/proposals — a lawyer sending a formal engagement offer.
 * No cold proposals: only creatable from a consultation between this
 * lawyer and the target client that's already APPROVED.
 */
export async function createProposal(lawyerId, { consultationId, feeStructure }) {
  const consultation = await prisma.consultation.findUnique({ where: { id: consultationId } });
  if (!consultation || consultation.lawyerId !== lawyerId) {
    throw new AppError(404, "Consultation not found.");
  }
  if (consultation.status !== "APPROVED") {
    throw new AppError(
      400,
      "A proposal can only be sent after this consultation has been approved (paid and admin-reviewed)."
    );
  }

  const existing = await prisma.proposal.findFirst({
    where: { consultationId, status: { in: ["SENT", "ACCEPTED"] } },
  });
  if (existing) {
    throw new AppError(409, "A proposal already exists for this consultation.");
  }

  const proposal = await prisma.proposal.create({
    data: {
      consultationId,
      lawyerId,
      clientId: consultation.clientId,
      feeStructure,
    },
    include: PROPOSAL_INCLUDE,
  });

  return toPublicProposal(proposal);
}

/**
 * GET /api/proposals/mine — role-aware: lawyers see what they've sent,
 * clients see what they've received.
 */
export async function listMine(user) {
  const where =
    user.role === "LAWYER"
      ? { lawyerId: user.id }
      : user.role === "CLIENT"
        ? { clientId: user.id }
        : null;

  if (!where) {
    throw new AppError(403, "Only clients and lawyers have proposals.");
  }

  const proposals = await prisma.proposal.findMany({
    where,
    include: PROPOSAL_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return proposals.map(toPublicProposal);
}

/**
 * PATCH /api/proposals/:id/accept — the client accepting a proposal.
 * Requires a retainer payment screenshot in the same request; on success
 * creates the Case (PENDING_PAYMENT) and its retainer Payment together.
 *
 * Enforces "one ACTIVE case per client" here (at creation time). A second
 * check happens again in adminService.reviewPayment at activation time,
 * to close the race where a client accepts two proposals (each fine on
 * its own, since neither case is ACTIVE yet) before either retainer is
 * reviewed by an admin.
 */
export async function acceptProposal(clientId, proposalId, file) {
  if (!file) {
    throw new AppError(400, "A retainer payment screenshot is required.");
  }

  const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
  if (!proposal || proposal.clientId !== clientId) {
    throw new AppError(404, "Proposal not found.");
  }
  if (proposal.status !== "SENT") {
    throw new AppError(400, "This proposal is no longer awaiting a response.");
  }

  const activeCase = await prisma.case.findFirst({ where: { clientId, status: "ACTIVE" } });
  if (activeCase) {
    throw new AppError(
      409,
      "You already have an active case. You can accept a new proposal once your current case is closed.",
      "ACTIVE_CASE_EXISTS"
    );
  }

  const retainerAmount = proposal.feeStructure?.retainerAmount;
  if (!retainerAmount) {
    throw new AppError(400, "This proposal has no retainer amount configured.");
  }

  const { caseRecord, payment } = await prisma.$transaction(async (tx) => {
    const caseRecord = await tx.case.create({
      data: { proposalId, clientId, lawyerId: proposal.lawyerId },
    });
    const payment = await tx.payment.create({
      data: {
        caseId: caseRecord.id,
        screenshotUrl: toFileUrl(file),
        amount: retainerAmount,
      },
    });
    await tx.proposal.update({ where: { id: proposalId }, data: { status: "ACCEPTED" } });
    return { caseRecord, payment };
  });

  return toPublicCase(caseRecord, payment);
}

/**
 * PATCH /api/proposals/:id/decline — the client turning down a proposal.
 * No payment involved; frees the client to keep browsing/booking.
 */
export async function declineProposal(clientId, proposalId) {
  const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
  if (!proposal || proposal.clientId !== clientId) {
    throw new AppError(404, "Proposal not found.");
  }
  if (proposal.status !== "SENT") {
    throw new AppError(400, "This proposal is no longer awaiting a response.");
  }

  const updated = await prisma.proposal.update({
    where: { id: proposalId },
    data: { status: "DECLINED" },
    include: PROPOSAL_INCLUDE,
  });

  return toPublicProposal(updated);
}

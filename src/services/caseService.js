import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

const PARTICIPANT_SELECT = { select: { id: true, name: true } };

// Deliberately a summary shape only (client/lawyer name, status, created
// date) for the roster views (12.5) — full case-detail (documents,
// milestones, hearings, etc.) is Track B's GET /api/cases/:id.
function toCaseSummary(caseRecord) {
  return {
    id: caseRecord.id,
    status: caseRecord.status,
    client: caseRecord.client,
    lawyer: caseRecord.lawyer,
    createdAt: caseRecord.createdAt,
  };
}

/**
 * GET /api/cases/mine — scoped to the caller's own cases, either as the
 * client (at most one ACTIVE at a time) or as the lawyer (no such limit,
 * used for the lawyer's client roster view).
 */
export async function listMine(user) {
  const where =
    user.role === "CLIENT"
      ? { clientId: user.id }
      : user.role === "LAWYER"
        ? { lawyerId: user.id }
        : null;

  if (!where) {
    throw new AppError(403, "Only clients and lawyers have cases.");
  }

  const cases = await prisma.case.findMany({
    where,
    include: { client: PARTICIPANT_SELECT, lawyer: PARTICIPANT_SELECT },
    orderBy: { createdAt: "desc" },
  });

  return cases.map(toCaseSummary);
}

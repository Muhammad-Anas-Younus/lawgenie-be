import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

const PARTICIPANT_SELECT = { select: { id: true, name: true, email: true, phone: true } };
const IDDAT_PERIOD_DAYS = 90; // three-lunar-month approximation used in Pakistani family law practice

function toPublicMilestone(m) {
  return {
    id: m.id,
    caseId: m.caseId,
    title: m.title,
    description: m.description,
    dueDate: m.dueDate,
    status: m.status,
    payments: m.payments?.map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      screenshotUrl: p.screenshotUrl,
    })),
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

function toPublicHearing(h) {
  return {
    id: h.id,
    caseId: h.caseId,
    date: h.date,
    location: h.location,
    notes: h.notes,
    createdAt: h.createdAt,
    updatedAt: h.updatedAt,
  };
}

function toPublicDocument(doc) {
  return {
    id: doc.id,
    ownerId: doc.ownerId,
    owner: doc.owner,
    caseId: doc.caseId,
    category: doc.category,
    url: doc.url,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    size: doc.size,
    groupId: doc.groupId,
    version: doc.version,
    uploadedAt: doc.uploadedAt,
  };
}

function toPublicCase(caseRecord) {
  return {
    id: caseRecord.id,
    proposalId: caseRecord.proposalId,
    client: caseRecord.client,
    lawyer: caseRecord.lawyer,
    status: caseRecord.status,
    progress: caseRecord.progress,
    createdAt: caseRecord.createdAt,
    proposal: caseRecord.proposal
      ? { id: caseRecord.proposal.id, feeStructure: caseRecord.proposal.feeStructure }
      : undefined,
    trackers: {
      iddat: {
        startDate: caseRecord.iddatStartDate,
        endDate: caseRecord.iddatEndDate,
      },
      mehr: {
        amount: caseRecord.mehrAmount,
        paid: caseRecord.mehrPaid,
      },
    },
  };
}

/**
 * Latest-version-only, oldest-first document list for a case (mirrors
 * documentService.listDocuments' versioning logic, but scoped by caseId
 * across both participants rather than by a single ownerId).
 */
async function listCaseDocuments(caseId) {
  const documents = await prisma.document.findMany({
    where: { caseId },
    include: { owner: { select: { id: true, name: true, role: true } } },
    orderBy: [{ groupId: "asc" }, { version: "desc" }],
  });

  const latestByGroup = new Map();
  for (const doc of documents) {
    if (!latestByGroup.has(doc.groupId)) {
      latestByGroup.set(doc.groupId, doc);
    }
  }

  return [...latestByGroup.values()]
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    .map(toPublicDocument);
}

/**
 * Loads a case and enforces the caller's access to it: client/lawyer are
 * restricted to their own case (404, not 403, so a case id isn't
 * enumerable), admin can load any case.
 */
async function loadAuthorizedCase(user, caseId) {
  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      client: PARTICIPANT_SELECT,
      lawyer: PARTICIPANT_SELECT,
      proposal: { select: { id: true, feeStructure: true } },
    },
  });

  if (!caseRecord) {
    throw new AppError(404, "Case not found.");
  }

  const isParticipant = caseRecord.clientId === user.id || caseRecord.lawyerId === user.id;
  if (user.role !== "ADMIN" && !isParticipant) {
    throw new AppError(404, "Case not found.");
  }

  return caseRecord;
}

/**
 * GET /api/cases/:id — full case detail: milestones, hearings, documents,
 * trackers, and a Mufti guidance log. The guidance log is left as an empty
 * array for now — Mufti queries are a Track C model landing later this
 * same wave, so there's nothing to populate yet, but the shape is ready.
 */
export async function getCaseDetail(user, caseId) {
  const caseRecord = await loadAuthorizedCase(user, caseId);

  const [milestones, hearings, documents] = await Promise.all([
    prisma.milestone.findMany({
      where: { caseId },
      include: { payments: true },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    }),
    prisma.hearing.findMany({ where: { caseId }, orderBy: { date: "asc" } }),
    listCaseDocuments(caseId),
  ]);

  return {
    ...toPublicCase(caseRecord),
    milestones: milestones.map(toPublicMilestone),
    hearings: hearings.map(toPublicHearing),
    documents,
    // Mufti guidance log — populated once MuftiQuery (Track C) lands.
    guidanceLog: [],
  };
}

/**
 * PATCH /api/cases/:id — restricted to the assigned lawyer. Covers
 * progress/status updates and the Iddat/Mehr trackers. `status` may only
 * move ACTIVE -> CLOSED here (PENDING_PAYMENT is admin/payment-approval
 * territory — see adminService.reviewPayment) — closing is what unlocks
 * Phase 9 review eligibility for both parties.
 */
export async function updateCase(lawyerId, caseId, updates) {
  const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseRecord || caseRecord.lawyerId !== lawyerId) {
    throw new AppError(404, "Case not found.");
  }

  const data = {};

  if (updates.progress !== undefined) {
    data.progress = updates.progress;
  }

  if (updates.status !== undefined) {
    if (caseRecord.status !== "ACTIVE" || updates.status !== "CLOSED") {
      throw new AppError(400, "A case can only be closed from ACTIVE status.");
    }
    data.status = "CLOSED";
  }

  if (updates.mehrAmount !== undefined) {
    data.mehrAmount = updates.mehrAmount;
  }
  if (updates.mehrPaid !== undefined) {
    data.mehrPaid = updates.mehrPaid;
  }

  if (updates.iddatStartDate !== undefined) {
    if (updates.iddatStartDate === null) {
      data.iddatStartDate = null;
      data.iddatEndDate = null;
    } else {
      const start = new Date(updates.iddatStartDate);
      data.iddatStartDate = start;
      data.iddatEndDate = new Date(start.getTime() + IDDAT_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    }
  }

  const updated = await prisma.case.update({
    where: { id: caseId },
    data,
    include: {
      client: PARTICIPANT_SELECT,
      lawyer: PARTICIPANT_SELECT,
      proposal: { select: { id: true, feeStructure: true } },
    },
  });

  return toPublicCase(updated);
}

async function assertLawyerOwnsCase(lawyerId, caseId) {
  const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseRecord || caseRecord.lawyerId !== lawyerId) {
    throw new AppError(404, "Case not found.");
  }
  return caseRecord;
}

/** POST /api/cases/:id/milestones — lawyer-only. */
export async function createMilestone(lawyerId, caseId, { title, description, dueDate, status }) {
  await assertLawyerOwnsCase(lawyerId, caseId);

  const milestone = await prisma.milestone.create({
    data: {
      caseId,
      title,
      description: description ?? null,
      dueDate: dueDate ?? null,
      status: status ?? "PENDING",
    },
    include: { payments: true },
  });

  return toPublicMilestone(milestone);
}

/** PATCH /api/cases/:id/milestones/:milestoneId — lawyer-only. */
export async function updateMilestone(lawyerId, caseId, milestoneId, updates) {
  await assertLawyerOwnsCase(lawyerId, caseId);

  const existing = await prisma.milestone.findUnique({ where: { id: milestoneId } });
  if (!existing || existing.caseId !== caseId) {
    throw new AppError(404, "Milestone not found.");
  }

  const milestone = await prisma.milestone.update({
    where: { id: milestoneId },
    data: updates,
    include: { payments: true },
  });

  return toPublicMilestone(milestone);
}

/** POST /api/cases/:id/hearings — lawyer-only. */
export async function createHearing(lawyerId, caseId, { date, location, notes }) {
  await assertLawyerOwnsCase(lawyerId, caseId);

  const hearing = await prisma.hearing.create({
    data: { caseId, date, location: location ?? null, notes: notes ?? null },
  });

  return toPublicHearing(hearing);
}

/** PATCH /api/cases/:id/hearings/:hearingId — lawyer-only. */
export async function updateHearing(lawyerId, caseId, hearingId, updates) {
  await assertLawyerOwnsCase(lawyerId, caseId);

  const existing = await prisma.hearing.findUnique({ where: { id: hearingId } });
  if (!existing || existing.caseId !== caseId) {
    throw new AppError(404, "Hearing not found.");
  }

  const hearing = await prisma.hearing.update({ where: { id: hearingId }, data: updates });
  return toPublicHearing(hearing);
}

/**
 * GET /api/hearings/mine — a lawyer's hearings aggregated across all of
 * their cases (7.9), most imminent first.
 */
export async function listMyHearings(lawyerId) {
  const hearings = await prisma.hearing.findMany({
    where: { case: { lawyerId } },
    include: {
      case: {
        select: {
          id: true,
          status: true,
          client: { select: { id: true, name: true } },
          proposal: { select: { feeStructure: true } },
        },
      },
    },
    orderBy: { date: "asc" },
  });

  return hearings.map((h) => ({
    ...toPublicHearing(h),
    case: {
      id: h.case.id,
      status: h.case.status,
      client: h.case.client,
      caseType: h.case.proposal?.feeStructure?.caseType ?? null,
    },
  }));
}

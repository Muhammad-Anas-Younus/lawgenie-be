import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { embedText } from "./embeddingService.js";
import { getOrCreateCollection, upsertSingleChunk } from "./vectorStore.js";

const PARTICIPANT_SELECT = { select: { id: true, name: true } };
const QUERY_INCLUDE = {
  lawyer: PARTICIPANT_SELECT,
  mufti: PARTICIPANT_SELECT,
  case: {
    select: {
      id: true,
      status: true,
      clientId: true,
      client: PARTICIPANT_SELECT,
    },
  },
  payments: true,
};

// PRD §6.5 fee tiers (PKR). Snapshotted onto MuftiQuery.fee at submission
// time — see schema comment.
const FEE_BY_URGENCY = { STANDARD: 300, URGENT: 600, CRITICAL: 1000 };

// Queue ordering priority — "organized by urgency level" per PRD's Mufti
// Dashboard spec. Prisma can't order by a custom enum sequence directly
// (alphabetical would put CRITICAL before STANDARD before URGENT), so the
// queue is sorted in JS after fetching.
const URGENCY_PRIORITY = { CRITICAL: 0, URGENT: 1, STANDARD: 2 };

function toFileUrl(file) {
  return file ? `/api/files/payments/${file.filename}` : null;
}

function toPublicQuery(query) {
  return {
    id: query.id,
    caseId: query.caseId,
    case: query.case,
    lawyer: query.lawyer,
    mufti: query.mufti,
    urgency: query.urgency,
    fee: query.fee,
    question: query.question,
    answer: query.answer,
    citations: query.citations,
    status: query.status,
    createdAt: query.createdAt,
    respondedAt: query.respondedAt,
    curatedAt: query.curatedAt,
    payments: query.payments?.map((p) => ({
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
 * POST /api/mufti-queries — a lawyer submitting an Islamic guidance
 * request on one of their own active cases, uploading the payment
 * screenshot in the same request (same "upload + create together" pattern
 * as proposalService.acceptProposal). Fee is snapshotted from the urgency
 * tier at submission time. The query starts PENDING_PAYMENT — it only
 * enters the Mufti queue once an admin approves the linked Payment (see
 * adminService.reviewPayment).
 */
export async function createMuftiQuery(lawyerId, { caseId, urgency, question }, file) {
  if (!file) {
    throw new AppError(400, "A payment screenshot is required.");
  }

  const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
  if (!caseRecord || caseRecord.lawyerId !== lawyerId) {
    throw new AppError(404, "Case not found.");
  }
  if (caseRecord.status !== "ACTIVE") {
    throw new AppError(400, "Islamic guidance can only be requested on an active case.");
  }

  const fee = FEE_BY_URGENCY[urgency];

  const created = await prisma.$transaction(async (tx) => {
    const query = await tx.muftiQuery.create({
      data: { caseId, lawyerId, urgency, fee, question },
    });
    await tx.payment.create({
      data: {
        muftiQueryId: query.id,
        screenshotUrl: toFileUrl(file),
        amount: fee,
      },
    });
    return query;
  });

  const full = await prisma.muftiQuery.findUnique({
    where: { id: created.id },
    include: QUERY_INCLUDE,
  });

  return toPublicQuery(full);
}

/**
 * GET /api/mufti-queries/mine — role-aware: a lawyer sees the queries
 * they've submitted, a Mufti sees the queries they've personally answered
 * (unanswered/unclaimed queries live in the shared queue instead — see
 * listQueue).
 */
export async function listMine(user) {
  const where =
    user.role === "LAWYER"
      ? { lawyerId: user.id }
      : user.role === "MUFTI"
        ? { muftiId: user.id }
        : null;

  if (!where) {
    throw new AppError(403, "Only lawyers and Muftis have mufti queries.");
  }

  const queries = await prisma.muftiQuery.findMany({
    where,
    include: QUERY_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return queries.map(toPublicQuery);
}

/**
 * GET /api/mufti-queries/queue — the shared, unclaimed queue of queries
 * awaiting a Mufti response. Any verified Mufti may view and respond to
 * any entry (first to respond claims it — see respondMuftiQuery). Only
 * queries whose payment has been admin-approved ever reach
 * PENDING_RESPONSE, so this never leaks an unpaid query to a Mufti.
 */
export async function listQueue() {
  const queries = await prisma.muftiQuery.findMany({
    where: { status: "PENDING_RESPONSE" },
    include: QUERY_INCLUDE,
  });

  queries.sort((a, b) => {
    const byUrgency = URGENCY_PRIORITY[a.urgency] - URGENCY_PRIORITY[b.urgency];
    return byUrgency !== 0 ? byUrgency : a.createdAt - b.createdAt;
  });

  return queries.map(toPublicQuery);
}

/**
 * GET /api/mufti-queries/:id — the submitting lawyer may always view their
 * own query; a Mufti may view it once it's left PENDING_PAYMENT (i.e. it's
 * either in the queue or already answered), or if they're the one who
 * answered it. 404s (not 403) on a mismatched caller, same as
 * consultations/proposals.
 */
export async function getById(user, id) {
  const query = await prisma.muftiQuery.findUnique({ where: { id }, include: QUERY_INCLUDE });
  if (!query) {
    throw new AppError(404, "Query not found.");
  }

  const isOwningLawyer = query.lawyerId === user.id;
  const isVisibleToMufti =
    user.role === "MUFTI" && (query.status !== "PENDING_PAYMENT" || query.muftiId === user.id);

  if (!isOwningLawyer && !isVisibleToMufti) {
    throw new AppError(404, "Query not found.");
  }

  return toPublicQuery(query);
}

/**
 * PATCH /api/mufti-queries/:id/respond — a Mufti answering a query off the
 * shared queue. Uses updateMany with a status guard so two Muftis racing
 * to answer the same query can't both "win" it — whoever's update actually
 * matches a row claims it (muftiId gets set here, at response time, not
 * at submission).
 */
export async function respondMuftiQuery(muftiId, id, { answer, citations }) {
  const result = await prisma.muftiQuery.updateMany({
    where: { id, status: "PENDING_RESPONSE" },
    data: { muftiId, answer, citations, status: "RESPONDED", respondedAt: new Date() },
  });

  if (result.count === 0) {
    const existing = await prisma.muftiQuery.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "Query not found.");
    }
    throw new AppError(409, "This query has already been answered or isn't awaiting a response.");
  }

  const full = await prisma.muftiQuery.findUnique({ where: { id }, include: QUERY_INCLUDE });
  return toPublicQuery(full);
}

/**
 * A case's Islamic guidance history, derived by reading RESPONDED
 * MuftiQuery rows for that case rather than maintaining a separate log —
 * see the MuftiQuery model comment in schema.prisma for the reasoning.
 * Not wired to a route in this phase (8.6, surfacing it in case detail
 * pages, is deferred to a later convergence wave); exported so that work
 * can just call this.
 */
export async function getGuidanceHistory(caseId) {
  const responded = await prisma.muftiQuery.findMany({
    where: { caseId, status: "RESPONDED" },
    include: QUERY_INCLUDE,
    orderBy: { respondedAt: "asc" },
  });

  return responded.map((q) => ({
    id: q.id,
    mufti: q.mufti,
    lawyer: q.lawyer,
    urgency: q.urgency,
    question: q.question,
    answer: q.answer,
    citations: q.citations,
    respondedAt: q.respondedAt,
  }));
}

/**
 * GET /api/admin/mufti-queries/curatable — RESPONDED queries not yet
 * approved for the chatbot's knowledge base (11.3), newest-answered first.
 */
export async function listCuratable() {
  const queries = await prisma.muftiQuery.findMany({
    where: { status: "RESPONDED", curatedAt: null },
    include: QUERY_INCLUDE,
    orderBy: { respondedAt: "desc" },
  });

  return queries.map(toPublicQuery);
}

/**
 * PATCH /api/admin/mufti-queries/:id/curate — admin approves an answered
 * query for reuse by the chatbot. Embeds the Q&A as a single chunk (a
 * fatwa is already a natural, self-contained unit — no need for
 * documentLoader's paragraph/heading chunking) and upserts it into the
 * same ChromaDB collection scripts/ingestDocuments.js populates, so
 * ragService.queryCollection picks it up on the very next chat query.
 * Re-curating (e.g. after a Mufti edit, if that ever lands) just
 * re-upserts under the same id — Chroma upsert overwrites in place.
 */
export async function curateForKnowledgeBase(queryId) {
  const query = await prisma.muftiQuery.findUnique({ where: { id: queryId } });
  if (!query) {
    throw new AppError(404, "Query not found.");
  }
  if (query.status !== "RESPONDED") {
    throw new AppError(400, "Only an answered query can be curated.");
  }

  const source = `Mufti Guidance: ${query.question.slice(0, 80)}`;
  const text = [
    `Question: ${query.question}`,
    `Answer: ${query.answer}`,
    query.citations.length > 0 ? `Citations: ${query.citations.join("; ")}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const embedding = await embedText(text);
  const collection = await getOrCreateCollection();
  await upsertSingleChunk(
    { id: `mufti-query-${query.id}`, text, embedding, metadata: { source, chunkIndex: 0 } },
    collection
  );

  const updated = await prisma.muftiQuery.update({
    where: { id: queryId },
    data: { curatedAt: new Date() },
    include: QUERY_INCLUDE,
  });

  return toPublicQuery(updated);
}

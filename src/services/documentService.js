import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

function toFileUrl(file) {
  return `/api/files/documents/${file.filename}`;
}

function toPublicDocument(doc) {
  return {
    id: doc.id,
    ownerId: doc.ownerId,
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

/**
 * POST /api/documents — upload a document into the caller's library.
 * Ownership is always the uploader (`ownerId`); `caseId` is a plain nullable
 * column until the Case model lands (Phase 7 / Track B) — no ownership
 * enforcement against a case is possible yet, so this only ever writes/
 * reads documents scoped to the caller (see listDocuments below).
 *
 * Versioning: when `replaces` is given, the new row inherits the prior
 * version's `groupId` and `caseId`/`category` (unless overridden), and its
 * `version` is the prior max + 1 — this is what keeps "re-uploading the
 * same logical document" from creating an unrelated row. `replaces` must
 * point at a document the caller owns.
 */
export async function createDocument(ownerId, { category, caseId, replaces }, file) {
  if (!file) {
    throw new AppError(400, "A file is required.");
  }

  let groupId = crypto.randomUUID();
  let version = 1;
  let resolvedCaseId = caseId ?? null;

  if (replaces) {
    const prior = await prisma.document.findUnique({ where: { id: replaces } });
    if (!prior || prior.ownerId !== ownerId) {
      throw new AppError(404, "Document to replace not found.");
    }

    const latestInGroup = await prisma.document.aggregate({
      where: { groupId: prior.groupId },
      _max: { version: true },
    });

    groupId = prior.groupId;
    version = (latestInGroup._max.version ?? prior.version) + 1;
    resolvedCaseId = caseId ?? prior.caseId;
  }

  const doc = await prisma.document.create({
    data: {
      ownerId,
      caseId: resolvedCaseId,
      category,
      url: toFileUrl(file),
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      groupId,
      version,
    },
  });

  return toPublicDocument(doc);
}

/**
 * GET /api/documents?caseId= — the caller's own document library, optionally
 * filtered by case. Returns only the latest version per logical document
 * unless `allVersions` is set. Scoped to `ownerId = user.id` for everyone,
 * including admins — case-participant access (client + lawyer both seeing
 * a shared case's documents) arrives once the Case model lands (Phase 7 /
 * Track B; see 10.3) and can check real participant membership.
 */
export async function listDocuments(user, { caseId, allVersions }) {
  const where = { ownerId: user.id, ...(caseId ? { caseId } : {}) };

  const documents = await prisma.document.findMany({
    where,
    orderBy: [{ groupId: "asc" }, { version: "desc" }],
  });

  if (allVersions) {
    return documents.map(toPublicDocument);
  }

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

import { Router } from "express";
import { createUploader } from "../middleware/upload.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createDocumentSchema, listDocumentsQuerySchema } from "../validators/documentValidators.js";
import * as documentService from "../services/documentService.js";

const router = Router();
const uploadDocument = createUploader("documents");

// POST /api/documents — multipart upload into the caller's document
// library. Pass `replaces=<documentId>` to add a new version of an
// existing logical document instead of creating an unrelated one.
router.post(
  "/",
  requireAuth,
  uploadDocument.single("file"),
  validate(createDocumentSchema),
  async (req, res, next) => {
    try {
      const result = await documentService.createDocument(req.user.id, req.body, req.file);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/documents?caseId= — the caller's own document library.
router.get("/", requireAuth, validate(listDocumentsQuerySchema, "query"), async (req, res, next) => {
  try {
    const documents = await documentService.listDocuments(req.user, req.query);
    res.status(200).json({ documents });
  } catch (err) {
    next(err);
  }
});

export default router;

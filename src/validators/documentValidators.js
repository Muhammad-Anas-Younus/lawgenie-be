import { z } from "zod";

// Multipart fields all arrive as strings, so this validates the text fields
// only — the file itself is handled by multer (see routes/documents.js).
export const createDocumentSchema = z.object({
  category: z.enum(["PLEADING", "EVIDENCE", "COURT_ORDER", "PERSONAL", "CREDENTIAL"]),
  caseId: z.string().uuid().optional(),
  // Id of the prior version being replaced, if this upload is a new
  // version of an existing logical document rather than a brand new one.
  replaces: z.string().uuid().optional(),
});

export const listDocumentsQuerySchema = z.object({
  caseId: z.string().uuid().optional(),
  allVersions: z.coerce.boolean().optional(),
});

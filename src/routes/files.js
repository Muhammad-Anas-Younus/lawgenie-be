import { Router } from "express";
import path from "path";
import fs from "fs";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";

const router = Router();

const UPLOADS_ROOT = path.resolve("uploads");
const ALLOWED_CATEGORIES = new Set(["payments", "documents", "credentials"]);

// Serves uploaded files behind auth instead of express.static, since these
// directories hold payment screenshots and identity documents. Ownership
// checks (client/lawyer can only fetch their own files) land once the
// Payment/Document models exist (Phase 3 / Phase 10); for now every
// authenticated user can fetch any file by exact path.
router.get("/:category/:filename", requireAuth, (req, res, next) => {
  const { category, filename } = req.params;

  if (!ALLOWED_CATEGORIES.has(category)) {
    return next(new AppError(404, "File not found."));
  }

  const categoryDir = path.join(UPLOADS_ROOT, category);
  const filePath = path.join(categoryDir, filename);

  if (!filePath.startsWith(categoryDir + path.sep)) {
    return next(new AppError(400, "Invalid file path."));
  }

  if (!fs.existsSync(filePath)) {
    return next(new AppError(404, "File not found."));
  }

  res.sendFile(filePath);
});

export default router;

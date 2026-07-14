import multer from "multer";
import path from "path";
import crypto from "crypto";
import { AppError } from "./errorHandler.js";

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new AppError(400, "Only PNG, JPEG, WEBP, or PDF files are allowed."));
  }
  cb(null, true);
}

/**
 * Builds a multer instance that writes into uploads/<subfolder> with
 * randomized filenames (never trust the client-supplied name). Shared
 * across every upload flow — credentials here, payment screenshots and
 * case documents in later phases — so storage/validation stays consistent.
 */
export function createUploader(subfolder) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.resolve("uploads", subfolder)),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });

  return multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });
}

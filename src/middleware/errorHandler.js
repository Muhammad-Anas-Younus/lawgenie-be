/**
 * Thrown by route handlers/services for expected failure cases (bad input,
 * missing resource, forbidden action) so the centralized handler below can
 * map them to the right HTTP status instead of logging them as 500s.
 */
export class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Centralized Express error handler. Must be registered last, after all
 * routes. Unexpected (non-AppError) failures are logged server-side and
 * returned as a generic 500 so internals never leak to the client.
 */
export function errorHandler(err, req, res, next) {
  // Multer errors (e.g. file too large) don't carry a statusCode — treat
  // them as client errors rather than falling through to the generic 500.
  if (err.name === "MulterError") {
    return res.status(400).json({ error: err.message });
  }

  const statusCode = err.statusCode || 500;

  if (statusCode === 500) {
    console.error("[Unhandled Error]", err);
  }

  res.status(statusCode).json({ error: err.message || "An unexpected error occurred." });
}

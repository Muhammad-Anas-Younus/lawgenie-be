/**
 * Thrown by route handlers/services for expected failure cases (bad input,
 * missing resource, forbidden action) so the centralized handler below can
 * map them to the right HTTP status instead of logging them as 500s.
 *
 * `code` is optional — a stable machine-readable string (e.g.
 * "ACTIVE_CASE_EXISTS") for the rare case where the frontend needs to
 * distinguish one 4xx from another beyond just showing `message`.
 */
export class AppError extends Error {
  constructor(statusCode, message, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
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

  const body = { error: err.message || "An unexpected error occurred." };
  if (err.code) {
    body.code = err.code;
  }
  res.status(statusCode).json(body);
}

import { ZodError } from "zod";

/**
 * Wraps a zod schema into request-validation middleware. Validates/coerces
 * req[part] in place (defaults to "body") and rejects with 400 + issue
 * details on failure, so route handlers can trust their input is shaped
 * correctly.
 */
export function validate(schema, part = "body") {
  return (req, res, next) => {
    try {
      req[part] = schema.parse(req[part]);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: "Validation failed.", details: err.issues });
      }
      next(err);
    }
  };
}

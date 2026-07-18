import { Router } from "express";
import { createUploader } from "../middleware/upload.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createMuftiQuerySchema, respondMuftiQuerySchema } from "../validators/muftiQueryValidators.js";
import * as muftiQueryService from "../services/muftiQueryService.js";

const router = Router();
// Payment screenshots go into the same uploads/payments/ folder as
// consultation/proposal payments.
const uploadPaymentScreenshot = createUploader("payments");

// POST /api/mufti-queries — a lawyer submitting an Islamic guidance
// request on one of their active cases, with the payment screenshot in
// the same request.
router.post(
  "/",
  requireAuth,
  requireRole("LAWYER"),
  uploadPaymentScreenshot.single("screenshot"),
  validate(createMuftiQuerySchema),
  async (req, res, next) => {
    try {
      const result = await muftiQueryService.createMuftiQuery(req.user.id, req.body, req.file);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/mufti-queries/mine — role-aware: lawyer sees what they've
// submitted, Mufti sees what they've personally answered. Registered
// before "/:id" so it isn't swallowed by the dynamic route.
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const result = await muftiQueryService.listMine(req.user);
    res.status(200).json({ queries: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/mufti-queries/queue — the shared queue of payment-approved
// queries awaiting a Mufti response.
router.get("/queue", requireAuth, requireRole("MUFTI"), async (req, res, next) => {
  try {
    const result = await muftiQueryService.listQueue();
    res.status(200).json({ queries: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/mufti-queries/:id — detail, restricted to the submitting
// lawyer or a Mufti (once it's payment-approved, or if they answered it).
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const result = await muftiQueryService.getById(req.user, req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/mufti-queries/:id/respond — a Mufti answering a query off
// the shared queue (with mandatory source citations).
router.patch(
  "/:id/respond",
  requireAuth,
  requireRole("MUFTI"),
  validate(respondMuftiQuerySchema),
  async (req, res, next) => {
    try {
      const result = await muftiQueryService.respondMuftiQuery(req.user.id, req.params.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;

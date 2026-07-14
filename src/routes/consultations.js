import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createConsultationSchema } from "../validators/consultationValidators.js";
import * as consultationService from "../services/consultationService.js";

const router = Router();

// POST /api/consultations — client books a consultation with a lawyer.
router.post(
  "/",
  requireAuth,
  requireRole("CLIENT"),
  validate(createConsultationSchema),
  async (req, res, next) => {
    try {
      const result = await consultationService.createConsultation(req.user.id, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/consultations/mine — the caller's own bookings (client or lawyer).
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const result = await consultationService.listMine(req.user);
    res.status(200).json({ consultations: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/consultations/:id — detail, restricted to the client/lawyer on it.
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const result = await consultationService.getById(req.user, req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

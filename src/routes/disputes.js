import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createDisputeSchema } from "../validators/disputeValidators.js";
import * as disputeService from "../services/disputeService.js";

const router = Router();

// POST /api/disputes — a client or lawyer flagging a problem on their own
// case for admin mediation. Either party on the case may raise it.
router.post(
  "/",
  requireAuth,
  requireRole("CLIENT", "LAWYER"),
  validate(createDisputeSchema),
  async (req, res, next) => {
    try {
      const result = await disputeService.createDispute(req.user.id, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;

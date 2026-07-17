import { Router } from "express";
import { createUploader } from "../middleware/upload.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createProposalSchema } from "../validators/proposalValidators.js";
import * as proposalService from "../services/proposalService.js";

const router = Router();
// Retainer screenshots are proof-of-payment images, same as consultation
// payments — reuse the same uploads/payments/ folder.
const uploadRetainerScreenshot = createUploader("payments");

// POST /api/proposals — a lawyer sending a formal engagement proposal.
// Only creatable from a consultation with that client that's already
// APPROVED (no cold proposals) — enforced in proposalService.
router.post(
  "/",
  requireAuth,
  requireRole("LAWYER"),
  validate(createProposalSchema),
  async (req, res, next) => {
    try {
      const result = await proposalService.createProposal(req.user.id, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/proposals/mine — role-aware: lawyer sees sent, client sees received.
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const result = await proposalService.listMine(req.user);
    res.status(200).json({ proposals: result });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/proposals/:id/accept — client accepts + uploads the retainer
// payment screenshot in the same request; creates the resulting Case
// (PENDING_PAYMENT) and its Payment together.
router.patch(
  "/:id/accept",
  requireAuth,
  requireRole("CLIENT"),
  uploadRetainerScreenshot.single("screenshot"),
  async (req, res, next) => {
    try {
      const result = await proposalService.acceptProposal(req.user.id, req.params.id, req.file);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/proposals/:id/decline — client turns down a proposal, no payment.
router.patch("/:id/decline", requireAuth, requireRole("CLIENT"), async (req, res, next) => {
  try {
    const result = await proposalService.declineProposal(req.user.id, req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

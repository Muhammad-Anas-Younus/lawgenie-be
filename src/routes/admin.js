import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { reviewPaymentSchema, reviewVerificationSchema } from "../validators/adminValidators.js";
import { reviewDisputeSchema } from "../validators/disputeValidators.js";
import * as adminService from "../services/adminService.js";
import * as disputeService from "../services/disputeService.js";
import * as reviewService from "../services/reviewService.js";
import * as muftiQueryService from "../services/muftiQueryService.js";

const router = Router();

// Every /api/admin/* route is restricted to ADMIN accounts.
router.use(requireAuth, requireRole("ADMIN"));

// GET /api/admin/payments/pending — payments awaiting review.
router.get("/payments/pending", async (req, res, next) => {
  try {
    const payments = await adminService.listPendingPayments();
    res.status(200).json({ payments });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/payments/:id — approve/reject a payment.
router.patch("/payments/:id", validate(reviewPaymentSchema), async (req, res, next) => {
  try {
    const result = await adminService.reviewPayment(req.user.id, req.params.id, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/verifications/pending — lawyers + Muftis awaiting credential review.
router.get("/verifications/pending", async (req, res, next) => {
  try {
    const verifications = await adminService.listPendingVerifications();
    res.status(200).json({ verifications });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/verifications/:id — approve/reject a lawyer's or Mufti's credentials.
router.patch("/verifications/:id", validate(reviewVerificationSchema), async (req, res, next) => {
  try {
    const result = await adminService.reviewVerification(req.params.id, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/messages/:id/flag — toggles a message's moderation flag (11.2a).
router.patch("/messages/:id/flag", async (req, res, next) => {
  try {
    const result = await adminService.toggleMessageFlag(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/messages/flagged — the flagged-message moderation queue (11.7).
router.get("/messages/flagged", async (req, res, next) => {
  try {
    const messages = await adminService.listFlaggedMessages();
    res.status(200).json({ messages });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reviews/flagged — the flagged-review moderation queue (11.7).
router.get("/reviews/flagged", async (req, res, next) => {
  try {
    const reviews = await reviewService.listFlagged();
    res.status(200).json({ reviews });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/reviews/:id/moderate — toggles a review's moderation flag (11.2b).
router.patch("/reviews/:id/moderate", async (req, res, next) => {
  try {
    const result = await reviewService.moderateReview(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/mufti-queries/curatable — answered queries not yet
// approved for the chatbot knowledge base (11.3).
router.get("/mufti-queries/curatable", async (req, res, next) => {
  try {
    const queries = await muftiQueryService.listCuratable();
    res.status(200).json({ queries });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/mufti-queries/:id/curate — approve an answered query
// for reuse by the chatbot's fatwa database (11.3).
router.patch("/mufti-queries/:id/curate", async (req, res, next) => {
  try {
    const result = await muftiQueryService.curateForKnowledgeBase(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/disputes — every dispute (open, in review, resolved) for
// the moderation queue.
router.get("/disputes", async (req, res, next) => {
  try {
    const disputes = await disputeService.listAll();
    res.status(200).json({ disputes });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/disputes/:id — admin moves a dispute to IN_REVIEW or
// closes it out RESOLVED (with a resolution note).
router.patch("/disputes/:id", validate(reviewDisputeSchema), async (req, res, next) => {
  try {
    const result = await disputeService.reviewDispute(req.params.id, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

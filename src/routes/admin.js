import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { reviewPaymentSchema, reviewVerificationSchema } from "../validators/adminValidators.js";
import * as adminService from "../services/adminService.js";

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

export default router;

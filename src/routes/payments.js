import { Router } from "express";
import { createUploader } from "../middleware/upload.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createPaymentSchema } from "../validators/consultationValidators.js";
import * as paymentService from "../services/paymentService.js";

const router = Router();
const uploadScreenshot = createUploader("payments");

// POST /api/payments — multipart screenshot upload tied to a target
// (only `consultationId` is supported until Phases 6/7/8 add case/
// milestone/mufti-query payments).
router.post(
  "/",
  requireAuth,
  requireRole("CLIENT"),
  uploadScreenshot.single("screenshot"),
  validate(createPaymentSchema),
  async (req, res, next) => {
    try {
      const result = await paymentService.createPayment(req.user.id, req.body, req.file);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;

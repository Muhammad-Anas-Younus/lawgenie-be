import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createReviewSchema } from "../validators/reviewValidators.js";
import * as reviewService from "../services/reviewService.js";

const router = Router();

// POST /api/reviews — client->lawyer, lawyer->client, or lawyer->mufti,
// gated by context/role rules enforced in reviewService.
router.post("/", requireAuth, validate(createReviewSchema), async (req, res, next) => {
  try {
    const result = await reviewService.createReview(req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

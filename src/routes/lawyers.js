import { Router } from "express";
import { createUploader } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { lawyerRegisterSchema } from "../validators/professionalValidators.js";
import {
  lawyerListQuerySchema,
  lawyerUpdateSchema,
  lawyerRecommendationsQuerySchema,
} from "../validators/lawyerValidators.js";
import { listReviewsQuerySchema } from "../validators/reviewValidators.js";
import * as lawyerService from "../services/lawyerService.js";
import * as reviewService from "../services/reviewService.js";

const router = Router();
const uploadCredentials = createUploader("credentials");

// POST /api/lawyers/register — multipart: credential files + profile fields.
router.post(
  "/register",
  uploadCredentials.fields([
    { name: "barCouncilLicense", maxCount: 1 },
    { name: "cnic", maxCount: 1 },
    { name: "educationCredentials", maxCount: 1 },
  ]),
  validate(lawyerRegisterSchema),
  async (req, res, next) => {
    try {
      const result = await lawyerService.registerLawyer(req.body, req.files);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/lawyers — public directory (filters + pagination).
router.get("/", validate(lawyerListQuerySchema, "query"), async (req, res, next) => {
  try {
    const result = await lawyerService.listLawyers(req.query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/lawyers/recommendations?caseType=... — AI-assisted matching.
// Registered before "/:id" so it isn't swallowed by the dynamic route.
router.get(
  "/recommendations",
  validate(lawyerRecommendationsQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const result = await lawyerService.getRecommendations(req.query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/lawyers/me — the authenticated lawyer's own profile.
router.get("/me", requireAuth, requireRole("LAWYER"), async (req, res, next) => {
  try {
    const result = await lawyerService.getOwnProfile(req.user.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/lawyers/me/earnings — the authenticated lawyer's earnings breakdown.
router.get("/me/earnings", requireAuth, requireRole("LAWYER"), async (req, res, next) => {
  try {
    const result = await lawyerService.getOwnEarnings(req.user.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/lawyers/me — the authenticated lawyer editing their own profile.
router.patch(
  "/me",
  requireAuth,
  requireRole("LAWYER"),
  validate(lawyerUpdateSchema),
  async (req, res, next) => {
    try {
      const result = await lawyerService.updateOwnProfile(req.user.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/lawyers/:id — public lawyer detail.
router.get("/:id", async (req, res, next) => {
  try {
    const result = await lawyerService.getLawyerById(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/lawyers/:id/reviews — public, feeds the profile's review list.
router.get("/:id/reviews", validate(listReviewsQuerySchema, "query"), async (req, res, next) => {
  try {
    const result = await reviewService.listLawyerReviews(req.params.id, req.query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

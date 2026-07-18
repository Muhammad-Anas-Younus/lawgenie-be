import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  updateCaseSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
  createHearingSchema,
  updateHearingSchema,
} from "../validators/caseValidators.js";
import * as caseService from "../services/caseService.js";

const router = Router();

// GET /api/cases/:id — full case detail (milestones, hearings, documents,
// trackers, guidance log). Ownership enforced in the service: client/
// lawyer restricted to their own case, admin can fetch any case.
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const result = await caseService.getCaseDetail(req.user, req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/cases/:id — the assigned lawyer updating progress/status/
// trackers. This is also where a case transitions to CLOSED.
router.patch(
  "/:id",
  requireAuth,
  requireRole("LAWYER"),
  validate(updateCaseSchema),
  async (req, res, next) => {
    try {
      const result = await caseService.updateCase(req.user.id, req.params.id, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/cases/:id/milestones — lawyer creates a milestone.
router.post(
  "/:id/milestones",
  requireAuth,
  requireRole("LAWYER"),
  validate(createMilestoneSchema),
  async (req, res, next) => {
    try {
      const result = await caseService.createMilestone(req.user.id, req.params.id, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/cases/:id/milestones/:milestoneId — lawyer updates a milestone.
router.patch(
  "/:id/milestones/:milestoneId",
  requireAuth,
  requireRole("LAWYER"),
  validate(updateMilestoneSchema),
  async (req, res, next) => {
    try {
      const result = await caseService.updateMilestone(
        req.user.id,
        req.params.id,
        req.params.milestoneId,
        req.body
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/cases/:id/hearings — lawyer creates a hearing.
router.post(
  "/:id/hearings",
  requireAuth,
  requireRole("LAWYER"),
  validate(createHearingSchema),
  async (req, res, next) => {
    try {
      const result = await caseService.createHearing(req.user.id, req.params.id, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/cases/:id/hearings/:hearingId — lawyer updates a hearing.
router.patch(
  "/:id/hearings/:hearingId",
  requireAuth,
  requireRole("LAWYER"),
  validate(updateHearingSchema),
  async (req, res, next) => {
    try {
      const result = await caseService.updateHearing(
        req.user.id,
        req.params.id,
        req.params.hearingId,
        req.body
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;

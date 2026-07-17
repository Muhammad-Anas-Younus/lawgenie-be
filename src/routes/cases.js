import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as caseService from "../services/caseService.js";

const router = Router();

// GET /api/cases/mine — the caller's own cases (client or lawyer view).
// NOTE: Track B is concurrently adding case-detail/update endpoints
// (GET/PATCH /api/cases/:id, milestones, hearings, etc.) to this same
// file — this route was added on track/d in isolation and will need a
// light manual merge, not a rewrite, when both branches land.
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const result = await caseService.listMine(req.user);
    res.status(200).json({ cases: result });
  } catch (err) {
    next(err);
  }
});

export default router;

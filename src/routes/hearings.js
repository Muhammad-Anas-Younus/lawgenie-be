import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as caseService from "../services/caseService.js";

const router = Router();

// GET /api/hearings/mine — a lawyer's hearings aggregated across all of
// their cases (7.9), most imminent first.
router.get("/mine", requireAuth, requireRole("LAWYER"), async (req, res, next) => {
  try {
    const hearings = await caseService.listMyHearings(req.user.id);
    res.status(200).json({ hearings });
  } catch (err) {
    next(err);
  }
});

export default router;

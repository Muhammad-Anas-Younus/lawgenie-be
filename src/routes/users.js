import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { updateSettingsSchema } from "../validators/userValidators.js";
import * as userService from "../services/userService.js";

const router = Router();

// GET /api/users/me/settings — profile info + notification prefs, shared
// across every role (client/lawyer/mufti/admin all hit this one endpoint).
router.get("/me/settings", requireAuth, async (req, res, next) => {
  try {
    const settings = await userService.getSettings(req.user.id);
    res.status(200).json(settings);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/me/settings — profile info, password change, and/or
// notification prefs. Any subset of fields may be present.
router.patch("/me/settings", requireAuth, validate(updateSettingsSchema), async (req, res, next) => {
  try {
    const settings = await userService.updateSettings(req.user.id, req.body);
    res.status(200).json(settings);
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { registerSchema, verifyOtpSchema, loginSchema } from "../validators/authValidators.js";
import * as authService from "../services/authService.js";

const router = Router();

// POST /api/auth/register — client registration (email/phone + password).
router.post("/register", validate(registerSchema), async (req, res, next) => {
  try {
    const result = await authService.registerClient(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-otp — confirms contact ownership, activates the
// account, and logs the user in.
router.post("/verify-otp", validate(verifyOtpSchema), async (req, res, next) => {
  try {
    const result = await authService.verifyOtpAndActivate(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Auth is stateless (JWT, no server-side session) — logout is a client-side
// token discard. This endpoint exists so the frontend has a stable place to
// call and so future server-side revocation (e.g. a blocklist) can land
// here without an API shape change.
router.post("/logout", (req, res) => {
  res.status(200).json({ message: "Logged out." });
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;

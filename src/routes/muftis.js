import { Router } from "express";
import { createUploader } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { muftiRegisterSchema } from "../validators/professionalValidators.js";
import * as muftiService from "../services/muftiService.js";

const router = Router();
const uploadCredentials = createUploader("credentials");

// POST /api/muftis/register — multipart: Islamic credentials file + profile fields.
router.post(
  "/register",
  uploadCredentials.single("credentials"),
  validate(muftiRegisterSchema),
  async (req, res, next) => {
    try {
      const result = await muftiService.registerMufti(req.body, { credentials: req.file ? [req.file] : [] });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;

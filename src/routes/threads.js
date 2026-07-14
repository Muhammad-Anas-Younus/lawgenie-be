import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { sendMessageSchema } from "../validators/messageValidators.js";
import * as messageService from "../services/messageService.js";

const router = Router();

// GET /api/threads/:type/:id/messages — full history for a consultation/case thread.
router.get("/:type/:id/messages", requireAuth, async (req, res, next) => {
  try {
    const messages = await messageService.listMessages(
      req.user,
      req.params.type.toUpperCase(),
      req.params.id
    );
    res.status(200).json({ messages });
  } catch (err) {
    next(err);
  }
});

// POST /api/threads/:type/:id/messages — send a message on a paid thread.
router.post(
  "/:type/:id/messages",
  requireAuth,
  validate(sendMessageSchema),
  async (req, res, next) => {
    try {
      const message = await messageService.sendMessage(
        req.user,
        req.params.type.toUpperCase(),
        req.params.id,
        req.body
      );
      res.status(201).json(message);
    } catch (err) {
      next(err);
    }
  }
);

export default router;

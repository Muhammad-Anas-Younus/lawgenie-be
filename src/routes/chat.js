import { Router } from 'express';
import { chat } from '../services/ragService.js';
import { clearSession } from '../middleware/session.js';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/chat
// ---------------------------------------------------------------------------

/**
 * Send a message to the LawGenie chatbot.
 *
 * Request body:
 *   {
 *     "sessionId": "string",   // Required — client-generated session identifier
 *     "message":   "string"    // Required — the user's question
 *   }
 *
 * Response:
 *   {
 *     "answer":    "string",
 *     "sources":   [{ "document": "string", "chunks": number }],
 *     "sessionId": "string"
 *   }
 */
router.post('/', async (req, res) => {
  const { sessionId, message } = req.body;

  // Validate required fields
  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
    return res.status(400).json({
      error: 'sessionId is required and must be a non-empty string.',
    });
  }

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({
      error: 'message is required and must be a non-empty string.',
    });
  }

  try {
    const { answer, sources } = await chat(sessionId.trim(), message.trim());

    return res.status(200).json({
      answer,
      sources,
      sessionId: sessionId.trim(),
    });
  } catch (err) {
    console.error('[POST /api/chat] Error:', err);
    return res.status(500).json({
      error: 'An internal error occurred while processing your request. Please try again.',
    });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/chat/:sessionId
// ---------------------------------------------------------------------------

/**
 * Clear the conversation history for a session.
 * The client calls this when the user wants to start a fresh conversation.
 *
 * Response:
 *   { "message": "Session cleared.", "sessionId": "string" }
 */
router.delete('/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId || sessionId.trim() === '') {
    return res.status(400).json({ error: 'sessionId param is required.' });
  }

  const existed = clearSession(sessionId.trim());

  return res.status(200).json({
    message: existed ? 'Session cleared.' : 'Session not found (nothing to clear).',
    sessionId: sessionId.trim(),
  });
});

export default router;

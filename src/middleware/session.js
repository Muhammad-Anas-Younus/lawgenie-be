/**
 * In-memory session store for conversation history.
 *
 * Structure:
 *   Map<sessionId, { role: 'user' | 'model', content: string }[]>
 *
 * Sessions are ephemeral — they exist only for the lifetime of the server
 * process. A server restart clears all sessions naturally.
 */

const sessions = new Map();

// Maximum messages to retain per session (prevents unbounded memory growth)
const MAX_MESSAGES_PER_SESSION = 20;

// Number of recent messages to include in each prompt (last 3 turns = 6 messages)
const HISTORY_WINDOW = 6;

/**
 * Returns the last HISTORY_WINDOW messages for a session.
 * Returns an empty array if the session doesn't exist yet.
 *
 * @param {string} sessionId
 * @returns {{ role: string, content: string }[]}
 */
export function getHistory(sessionId) {
  const messages = sessions.get(sessionId) || [];
  return messages.slice(-HISTORY_WINDOW);
}

/**
 * Appends a single message to a session's history.
 * Trims the session to MAX_MESSAGES_PER_SESSION if it grows too large.
 *
 * @param {string} sessionId
 * @param {'user' | 'model'} role
 * @param {string} content
 */
export function appendMessage(sessionId, role, content) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }

  const messages = sessions.get(sessionId);
  messages.push({ role, content });

  // Trim oldest messages if the session exceeds the cap
  if (messages.length > MAX_MESSAGES_PER_SESSION) {
    messages.splice(0, messages.length - MAX_MESSAGES_PER_SESSION);
  }
}

/**
 * Deletes a session from memory entirely.
 * Called when the client explicitly requests a fresh conversation.
 *
 * @param {string} sessionId
 * @returns {boolean} true if the session existed and was deleted, false otherwise
 */
export function clearSession(sessionId) {
  return sessions.delete(sessionId);
}

/**
 * Returns the number of active sessions currently in memory.
 * Useful for health/debug endpoints.
 *
 * @returns {number}
 */
export function getSessionCount() {
  return sessions.size;
}

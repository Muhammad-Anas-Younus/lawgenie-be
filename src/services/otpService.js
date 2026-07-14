/**
 * In-memory OTP store, keyed by identifier (email or phone).
 *
 * There is no SMS/email gateway wired up yet — codes are generated here and
 * handed back to the caller (route decides whether to expose them in the
 * response, gated on NODE_ENV). Like the chat session store, this is
 * ephemeral: a server restart invalidates all pending OTPs, which is fine
 * given their short TTL.
 */

const otps = new Map();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_LENGTH = 6;

/**
 * Generates and stores a new OTP for the given identifier, overwriting any
 * previous pending code.
 *
 * @param {string} identifier
 * @returns {string} the generated code
 */
export function generateOtp(identifier) {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  const code = String(Math.floor(min + Math.random() * (max - min + 1)));

  otps.set(identifier, { code, expiresAt: Date.now() + OTP_TTL_MS });

  return code;
}

/**
 * Verifies a submitted code against the stored OTP for an identifier.
 * Codes are single-use — a successful or expired check clears the entry.
 *
 * @param {string} identifier
 * @param {string} code
 * @returns {boolean}
 */
export function verifyOtp(identifier, code) {
  const entry = otps.get(identifier);

  if (!entry) {
    return false;
  }

  if (Date.now() > entry.expiresAt) {
    otps.delete(identifier);
    return false;
  }

  const isMatch = entry.code === code;
  if (isMatch) {
    otps.delete(identifier);
  }

  return isMatch;
}

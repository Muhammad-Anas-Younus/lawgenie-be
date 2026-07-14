import jwt from "jsonwebtoken";

const TOKEN_TTL = "7d";

/**
 * Issues a signed JWT carrying the claims requireAuth/requireRole rely on.
 * Auth is stateless, so id + role must be enough for every downstream
 * authorization check.
 */
export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, phone: user.phone },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

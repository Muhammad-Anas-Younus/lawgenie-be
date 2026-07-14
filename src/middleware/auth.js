import jwt from "jsonwebtoken";

/**
 * Verifies the Bearer JWT on the request and attaches its claims to
 * req.user. Auth is stateless — there is no server-side session store, so
 * every claim the rest of the app relies on (id, role) must live in the
 * token itself.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

/**
 * Restricts a route to specific roles. Must run after requireAuth.
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions." });
    }

    next();
  };
}

import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

const SALT_ROUNDS = 10;

function toPublicSettings(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isVerified: user.isVerified,
    notificationPrefs: user.notificationPrefs,
    createdAt: user.createdAt,
  };
}

/**
 * GET /api/users/me/settings — same shape for every role; profile info +
 * notification prefs. Password hash is never returned.
 */
export async function getSettings(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, "User not found.");
  }
  return toPublicSettings(user);
}

/**
 * PATCH /api/users/me/settings — updates whichever fields are present.
 * Shared across roles since it only ever touches base User columns
 * (name/email/phone/password/notificationPrefs) — see validator comment.
 */
export async function updateSettings(userId, { name, email, phone, currentPassword, newPassword, notificationPrefs }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, "User not found.");
  }

  const data = {};

  if (name !== undefined) {
    data.name = name;
  }

  if (email !== undefined && email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== userId) {
      throw new AppError(409, "This email is already in use.");
    }
    data.email = email;
  }

  if (phone !== undefined && phone !== user.phone) {
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing && existing.id !== userId) {
      throw new AppError(409, "This phone number is already in use.");
    }
    data.phone = phone;
  }

  if (newPassword) {
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new AppError(401, "Current password is incorrect.");
    }
    data.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  }

  if (notificationPrefs !== undefined) {
    data.notificationPrefs = { ...user.notificationPrefs, ...notificationPrefs };
  }

  const updated = await prisma.user.update({ where: { id: userId }, data });
  return toPublicSettings(updated);
}

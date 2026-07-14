import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";
import { signToken } from "../utils/jwt.js";
import { generateOtp, verifyOtp } from "./otpService.js";
import { AppError } from "../middleware/errorHandler.js";

const SALT_ROUNDS = 10;

function toPublicUser(user) {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

function findByIdentifier(identifier) {
  return prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { phone: identifier }] },
  });
}

/**
 * Registers a new client account (email/phone + password) and issues an
 * OTP for contact verification. Lawyer/Mufti registration is a separate
 * flow (see lawyerService/muftiService) since it also creates a profile
 * with credential uploads.
 */
export async function registerClient({ name, email, phone, password }) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [email ? { email } : undefined, phone ? { phone } : undefined].filter(Boolean),
    },
  });

  if (existing) {
    throw new AppError(409, "An account with this email or phone already exists.");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash, role: "CLIENT" },
  });

  const identifier = email || phone;
  const otp = generateOtp(identifier);

  return {
    message: "Registration successful. Verify the OTP sent to your email/phone.",
    userId: user.id,
    identifier,
    // No SMS/email gateway wired up yet — expose the code directly outside
    // production so the flow is testable end-to-end.
    otp: process.env.NODE_ENV === "production" ? undefined : otp,
  };
}

export async function verifyOtpAndActivate({ identifier, code }) {
  const isValid = verifyOtp(identifier, code);
  if (!isValid) {
    throw new AppError(400, "Invalid or expired OTP.");
  }

  const user = await findByIdentifier(identifier);
  if (!user) {
    throw new AppError(404, "Account not found.");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true },
  });

  const token = signToken(updated);
  return { token, user: toPublicUser(updated) };
}

export async function login({ identifier, password }) {
  const user = await findByIdentifier(identifier);
  if (!user) {
    throw new AppError(401, "Invalid credentials.");
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError(401, "Invalid credentials.");
  }

  if (!user.isVerified) {
    throw new AppError(403, "Account not verified. Please verify your OTP first.");
  }

  const token = signToken(user);
  return { token, user: toPublicUser(user) };
}

export async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, "User not found.");
  }
  return toPublicUser(user);
}

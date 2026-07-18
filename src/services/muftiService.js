import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";
import { generateOtp } from "./otpService.js";
import { AppError } from "../middleware/errorHandler.js";

const SALT_ROUNDS = 10;

function toFileUrl(file) {
  return file ? `/api/files/credentials/${file.filename}` : null;
}

/**
 * Registers a Mufti: creates the User + a PENDING_VERIFICATION
 * MuftiProfile in one transaction, then issues an OTP for contact
 * verification. Credential review is a separate, later step (Phase 4).
 */
export async function registerMufti(
  { name, email, phone, password, specialization, bio, languages },
  files
) {
  const existing = await prisma.user.findFirst({
    where: { OR: [email ? { email } : undefined, phone ? { phone } : undefined].filter(Boolean) },
  });
  if (existing) {
    throw new AppError(409, "An account with this email or phone already exists.");
  }

  const credentials = files?.credentials?.[0];
  if (!credentials) {
    throw new AppError(400, "Islamic credentials file is required.");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name, email, phone, passwordHash, role: "MUFTI" },
    });

    await tx.muftiProfile.create({
      data: {
        userId: created.id,
        credentialsUrl: toFileUrl(credentials),
        specialization: specialization ?? [],
        bio: bio ?? null,
        languages: languages ?? [],
      },
    });

    return created;
  });

  const identifier = email || phone;
  const otp = generateOtp(identifier);

  return {
    message: "Registration submitted. Verify your OTP, then await admin credential review.",
    userId: user.id,
    identifier,
    otp: process.env.NODE_ENV === "production" ? undefined : otp,
  };
}

/**
 * GET /api/muftis/me/earnings — aggregates every APPROVED payment on this
 * Mufti's answered queries. Unlike a lawyer, a Mufti has exactly one
 * payment type (the MuftiQuery fee — see schema comment on Payment), so
 * there's no byType breakdown, just a total + urgency-tier subtotal
 * (mirroring the fee-tier structure in MuftiQueryUrgency) for a bit of
 * shape parity with the lawyer endpoint's breakdown.
 */
export async function getOwnEarnings(muftiId) {
  const payments = await prisma.payment.findMany({
    where: { status: "APPROVED", muftiQuery: { muftiId } },
    include: {
      muftiQuery: {
        include: { lawyer: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const transactions = payments.map((p) => ({
    id: p.id,
    type: "MUFTI_FEE",
    amount: p.amount,
    urgency: p.muftiQuery?.urgency ?? null,
    lawyer: p.muftiQuery?.lawyer ?? null,
    muftiQueryId: p.muftiQueryId,
    createdAt: p.createdAt,
    reviewedAt: p.reviewedAt,
  }));

  const byUrgency = { STANDARD: 0, URGENT: 0, CRITICAL: 0 };
  for (const t of transactions) {
    if (t.urgency && byUrgency[t.urgency] !== undefined) {
      byUrgency[t.urgency] += t.amount;
    }
  }

  return {
    total: transactions.reduce((sum, t) => sum + t.amount, 0),
    byUrgency,
    transactions,
  };
}

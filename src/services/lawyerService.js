import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";
import { generateOtp } from "./otpService.js";
import { AppError } from "../middleware/errorHandler.js";
import { getLLM, CHAT_MODEL } from "../config/gemini.js";
import { matchCategory } from "./caseCategories.js";

const SALT_ROUNDS = 10;

function toFileUrl(file) {
  return file ? `/api/files/credentials/${file.filename}` : null;
}

// Key fields a client needs to actually evaluate/book a lawyer. Checked
// against the *merged* (existing + incoming patch) profile on every /me
// update so isProfileCompleted always reflects the current row.
function computeIsProfileCompleted(profile) {
  return Boolean(
    profile.bio &&
    profile.city &&
    profile.experienceYears != null &&
    profile.consultationFee != null &&
    profile.specialization?.length > 0,
  );
}

// Public-facing shape for the directory/detail views. Deliberately omits
// email/phone — "no contact until paid" (see Phase 5.2) means direct
// contact details shouldn't be scrapeable from an unauthenticated listing.
function toPublicLawyer(profile) {
  return {
    id: profile.userId,
    name: profile.user.name,
    bio: profile.bio,
    city: profile.city,
    specialization: profile.specialization,
    experienceYears: profile.experienceYears,
    consultationFee: profile.consultationFee,
    feeStructure: profile.feeStructure,
    availability: profile.availability,
    languages: profile.languages,
    jurisdictions: profile.jurisdictions,
    averageRating: profile.averageRating,
    reviewCount: profile.reviewCount,
    verified: profile.verificationStatus === "VERIFIED",
    createdAt: profile.createdAt,
  };
}

const LAWYER_PROFILE_INCLUDE = { user: { select: { name: true } } };

/**
 * GET /api/lawyers — public directory. Only ever surfaces VERIFIED lawyers;
 * an unverified profile isn't "live" yet (PRD 6.1).
 */
export async function listLawyers({
  specialization,
  city,
  minFee,
  maxFee,
  minExperience,
  maxExperience,
  minRating,
  availableOn,
  search,
  page,
  limit,
}) {
  const where = {
    verificationStatus: "VERIFIED",
    isProfileCompleted: true,
    ...(specialization ? { specialization: { has: specialization } } : {}),
    ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
    ...(minRating !== undefined ? { averageRating: { gte: minRating } } : {}),
    ...(availableOn
      ? { availability: { path: [availableOn], equals: true } }
      : {}),
    ...(minFee !== undefined || maxFee !== undefined
      ? {
          consultationFee: {
            ...(minFee !== undefined ? { gte: minFee } : {}),
            ...(maxFee !== undefined ? { lte: maxFee } : {}),
          },
        }
      : {}),
    ...(minExperience !== undefined || maxExperience !== undefined
      ? {
          experienceYears: {
            ...(minExperience !== undefined ? { gte: minExperience } : {}),
            ...(maxExperience !== undefined ? { lte: maxExperience } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { bio: { contains: search, mode: "insensitive" } },
            { specialization: { has: search } },
            { user: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [profiles, total] = await Promise.all([
    prisma.lawyerProfile.findMany({
      where,
      include: LAWYER_PROFILE_INCLUDE,
      orderBy: [{ averageRating: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lawyerProfile.count({ where }),
  ]);

  return {
    lawyers: profiles.map(toPublicLawyer),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * GET /api/lawyers/:id — public detail. 404s (rather than 403) for a
 * not-yet-verified or not-yet-complete profile so those accounts aren't
 * enumerable.
 */
export async function getLawyerById(userId) {
  const profile = await prisma.lawyerProfile.findUnique({
    where: { userId },
    include: LAWYER_PROFILE_INCLUDE,
  });

  if (
    !profile ||
    profile.verificationStatus !== "VERIFIED" ||
    !profile.isProfileCompleted
  ) {
    throw new AppError(404, "Lawyer not found.");
  }

  return toPublicLawyer(profile);
}

/**
 * GET /api/lawyers/me — the authenticated lawyer's own profile, including
 * fields hidden from the public view (verification status/reason).
 */
export async function getOwnProfile(userId) {
  const profile = await prisma.lawyerProfile.findUnique({
    where: { userId },
    include: LAWYER_PROFILE_INCLUDE,
  });

  if (!profile) {
    throw new AppError(404, "Lawyer profile not found.");
  }

  return {
    ...toPublicLawyer(profile),
    isProfileCompleted: profile.isProfileCompleted,
    verificationStatus: profile.verificationStatus,
    verificationReason: profile.verificationReason,
  };
}

/**
 * PATCH /api/lawyers/me — a lawyer editing their own profile. Credential
 * files and verification status are not editable here (Phase 4 territory).
 */
export async function updateOwnProfile(userId, data) {
  const existing = await prisma.lawyerProfile.findUnique({ where: { userId } });
  if (!existing) {
    throw new AppError(404, "Lawyer profile not found.");
  }

  const profile = await prisma.lawyerProfile.update({
    where: { userId },
    data: {
      ...data,
      isProfileCompleted: computeIsProfileCompleted({ ...existing, ...data }),
    },
    include: LAWYER_PROFILE_INCLUDE,
  });

  return {
    ...toPublicLawyer(profile),
    isProfileCompleted: profile.isProfileCompleted,
    verificationStatus: profile.verificationStatus,
    verificationReason: profile.verificationReason,
  };
}

/**
 * GET /api/lawyers/me/earnings — aggregates every APPROVED payment across
 * the three payment types a lawyer can earn from (consultation fee, case
 * retainer, milestone payment), traced back to this lawyer via the
 * underlying record's lawyerId (Payment itself has no lawyerId — see
 * schema comment on the Payment model). Only APPROVED payments count as
 * real earnings; PENDING/REJECTED are excluded entirely (unlike the
 * frontend's old dummy data, which also surfaced pending/overdue amounts —
 * there's no "overdue" concept here since there's no billing schedule,
 * just admin-reviewed proof-of-payment screenshots).
 */
export async function getOwnEarnings(lawyerId) {
  const [consultationPayments, casePayments, milestonePayments] =
    await Promise.all([
      prisma.payment.findMany({
        where: { status: "APPROVED", consultation: { lawyerId } },
        include: {
          consultation: {
            include: { client: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.findMany({
        where: { status: "APPROVED", case: { lawyerId } },
        include: {
          case: { include: { client: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.findMany({
        where: { status: "APPROVED", milestone: { case: { lawyerId } } },
        include: {
          milestone: {
            include: {
              case: {
                include: { client: { select: { id: true, name: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const sum = (payments) => payments.reduce((total, p) => total + p.amount, 0);

  const transactions = [
    ...consultationPayments.map((p) => ({
      id: p.id,
      type: "CONSULTATION",
      amount: p.amount,
      client: p.consultation?.client ?? null,
      consultationId: p.consultationId,
      caseId: null,
      milestoneId: null,
      createdAt: p.createdAt,
      reviewedAt: p.reviewedAt,
    })),
    ...casePayments.map((p) => ({
      id: p.id,
      type: "RETAINER",
      amount: p.amount,
      client: p.case?.client ?? null,
      consultationId: null,
      caseId: p.caseId,
      milestoneId: null,
      createdAt: p.createdAt,
      reviewedAt: p.reviewedAt,
    })),
    ...milestonePayments.map((p) => ({
      id: p.id,
      type: "MILESTONE",
      amount: p.amount,
      client: p.milestone?.case?.client ?? null,
      consultationId: null,
      caseId: p.milestone?.caseId ?? null,
      milestoneId: p.milestoneId,
      createdAt: p.createdAt,
      reviewedAt: p.reviewedAt,
    })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const byType = {
    consultations: sum(consultationPayments),
    retainers: sum(casePayments),
    milestones: sum(milestonePayments),
  };

  return {
    total: byType.consultations + byType.retainers + byType.milestones,
    byType,
    transactions,
  };
}

/**
 * GET /api/lawyers/recommendations — AI-assisted matching (PRD 6.3) over
 * the currently verified lawyer pool. Falls back to a simple specialization
 * match, ranked by rating/experience, if Gemini is unavailable or returns
 * something unusable — the endpoint should never hard-fail just because the
 * LLM call did.
 */
export async function getRecommendations({ caseType, budget, location }) {
  const candidates = await prisma.lawyerProfile.findMany({
    where: { verificationStatus: "VERIFIED", isProfileCompleted: true },
    include: LAWYER_PROFILE_INCLUDE,
    take: 50,
  });

  if (candidates.length === 0) {
    return { recommendations: [] };
  }

  const byId = new Map(candidates.map((c) => [c.userId, c]));

  const candidateSummaries = candidates.map((c) => ({
    id: c.userId,
    specialization: c.specialization,
    city: c.city,
    experienceYears: c.experienceYears,
    consultationFee: c.consultationFee,
    languages: c.languages,
    averageRating: c.averageRating,
  }));

  function fallback() {
    const caseTypeLower = (caseType ?? "").toLowerCase();
    const ranked = candidates
      .filter(
        (c) =>
          c.specialization.some(
            (s) =>
              s.toLowerCase().includes(caseTypeLower) ||
              caseTypeLower.includes(s.toLowerCase()),
          ) ||
          (location &&
            c.city &&
            c.city.toLowerCase() === location.toLowerCase()),
      )
      .sort(
        (a, b) =>
          (b.averageRating ?? 0) - (a.averageRating ?? 0) ||
          (b.experienceYears ?? 0) - (a.experienceYears ?? 0),
      );

    const pool = ranked.length > 0 ? ranked : candidates;
    return {
      recommendations: pool.slice(0, 5).map((c) => ({
        ...toPublicLawyer(c),
        matchReason:
          "Matched by specialization/location (AI ranking unavailable).",
      })),
    };
  }

  try {
    const openrouter = getLLM();
    const prompt = `You are matching a client to lawyers on LawGenie, a Pakistani family law platform.

Client's case type: "${caseType ?? ""}"
${budget !== undefined ? `Client's budget (PKR, consultation fee): ${budget}` : ""}
${location ? `Client's preferred location: "${location}"` : ""}

Candidate lawyers (JSON):
${JSON.stringify(candidateSummaries)}

Pick up to 5 of the best-matching lawyers for this case, ranked best first, considering specialization relevance, budget fit, location, and rating.
Respond with ONLY a JSON array, no markdown, no explanation, in this exact shape:
[{"id": "<lawyer id>", "reason": "<one short sentence>"}]`;

    const completion = await openrouter.chat.send({
      chatRequest: {
        model: CHAT_MODEL,
        messages: [{ role: "user", content: prompt }],
      },
    });
    const text = (completion.choices[0].message.content ?? "")
      .trim()
      .replace(/^```(json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) {
      return fallback();
    }

    const recommendations = parsed
      .filter((entry) => byId.has(entry.id))
      .map((entry) => ({
        ...toPublicLawyer(byId.get(entry.id)),
        matchReason: entry.reason ?? null,
      }));

    return recommendations.length > 0 ? { recommendations } : fallback();
  } catch {
    return fallback();
  }
}

/**
 * Computes a real, DB-derived cost estimate for a family-law case
 * category — used by the chatbot (ragService) so it can tell a user what
 * things typically cost on LawGenie without an LLM guessing at Pakistani
 * legal fees from its own (unverifiable, possibly wrong) training data.
 *
 * Consultation fee is a flat per-lawyer figure (LawyerProfile.consultationFee
 * isn't tied to case type), so that average is always platform-wide.
 * Retainer figures come from ACCEPTED proposals' feeStructure.retainerAmount
 * — freeform caseType text, so each is bucketed into CASE_CATEGORIES via
 * matchCategory before averaging. Categories with fewer than 2 accepted
 * proposals fall back to the platform-wide retainer average instead of a
 * near-meaningless single-sample "average", and say so via
 * `retainer.isCategorySpecific`.
 *
 * @param {string} category - one of CASE_CATEGORIES
 * @returns {Promise<{
 *   category: string,
 *   consultationFee: { avg: number|null, sampleSize: number },
 *   retainer: { avg: number|null, min: number|null, max: number|null, sampleSize: number, isCategorySpecific: boolean },
 * }>}
 */
export async function getCostEstimate(category) {
  const [consultationFeeAgg, acceptedProposals] = await Promise.all([
    prisma.lawyerProfile.aggregate({
      where: { verificationStatus: "VERIFIED", consultationFee: { not: null } },
      _avg: { consultationFee: true },
      _count: true,
    }),
    prisma.proposal.findMany({
      where: { status: "ACCEPTED" },
      select: { feeStructure: true },
    }),
  ]);

  const retainers = acceptedProposals
    .map((p) => ({
      amount: p.feeStructure?.retainerAmount,
      category: matchCategory(p.feeStructure?.caseType),
    }))
    .filter((r) => typeof r.amount === "number");

  function retainerStats(rows) {
    if (rows.length === 0) return null;
    const amounts = rows.map((r) => r.amount);
    return {
      avg: Math.round(amounts.reduce((sum, a) => sum + a, 0) / amounts.length),
      min: Math.min(...amounts),
      max: Math.max(...amounts),
      sampleSize: amounts.length,
    };
  }

  const categoryRows = retainers.filter((r) => r.category === category);
  const categoryStats = categoryRows.length >= 2 ? retainerStats(categoryRows) : null;
  const platformStats = retainerStats(retainers);

  return {
    category,
    consultationFee: {
      avg: consultationFeeAgg._avg.consultationFee ? Math.round(consultationFeeAgg._avg.consultationFee) : null,
      sampleSize: consultationFeeAgg._count,
    },
    retainer: categoryStats
      ? { ...categoryStats, isCategorySpecific: true }
      : platformStats
        ? { ...platformStats, isCategorySpecific: false }
        : { avg: null, min: null, max: null, sampleSize: 0, isCategorySpecific: false },
  };
}

/**
 * Registers a lawyer: creates the User + a PENDING_VERIFICATION
 * LawyerProfile in one transaction, then issues an OTP for contact
 * verification. Credential review (admin approving the uploaded license/
 * CNIC) is a separate, later step — see Phase 4.
 */
export async function registerLawyer(
  {
    name,
    email,
    phone,
    password,
    specialization,
    experienceYears,
    bio,
    city,
    consultationFee,
    languages,
    jurisdictions,
  },
  files,
) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [email ? { email } : undefined, phone ? { phone } : undefined].filter(
        Boolean,
      ),
    },
  });
  if (existing) {
    throw new AppError(
      409,
      "An account with this email or phone already exists.",
    );
  }

  const barCouncilLicense = files?.barCouncilLicense?.[0];
  const cnic = files?.cnic?.[0];
  const educationCredentials = files?.educationCredentials?.[0];

  if (!barCouncilLicense || !cnic) {
    throw new AppError(400, "Bar Council license and CNIC files are required.");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name, email, phone, passwordHash, role: "LAWYER" },
    });

    const profileFields = {
      specialization: specialization ?? [],
      experienceYears: experienceYears ?? null,
      bio: bio ?? null,
      city: city ?? null,
      consultationFee: consultationFee ?? null,
      languages: languages ?? [],
      jurisdictions: jurisdictions ?? [],
    };

    await tx.lawyerProfile.create({
      data: {
        userId: created.id,
        barCouncilLicenseUrl: toFileUrl(barCouncilLicense),
        cnicUrl: toFileUrl(cnic),
        educationCredentialsUrl: toFileUrl(educationCredentials),
        ...profileFields,
        isProfileCompleted: computeIsProfileCompleted(profileFields),
      },
    });

    return created;
  });

  const identifier = email || phone;
  const otp = generateOtp(identifier);

  return {
    message:
      "Registration submitted. Verify your OTP, then await admin credential review.",
    userId: user.id,
    identifier,
    otp: process.env.NODE_ENV === "production" ? undefined : otp,
  };
}

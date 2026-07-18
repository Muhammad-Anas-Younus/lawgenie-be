import { prisma } from "../config/prisma.js";

// Every figure here is derived live from existing models (User, Case,
// Payment, Review, MuftiQuery) via groupBy/aggregate/count — there is no
// separate analytics/events table, matching the rest of the admin
// aggregation precedent (adminService.listPendingPayments,
// reviewService.syncLawyerRating, lawyerService.getOwnEarnings).

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Builds `count` trailing months (oldest first) as { year, month, label,
// start, end } buckets, the last one being the current month. Mirrors the
// dummy GROWTH_DATA's month-over-month shape so the frontend chart binds
// to something familiar.
function trailingMonths(count) {
  const now = new Date();
  const buckets = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    buckets.push({
      label: MONTH_LABELS[start.getMonth()],
      year: start.getFullYear(),
      start,
      end,
    });
  }
  return buckets;
}

function zeroByStatus(statuses) {
  return Object.fromEntries(statuses.map((s) => [s, { count: 0, amount: 0 }]));
}

/**
 * GET /api/admin/analytics/overview — the top-level stat cards + growth
 * chart data (replaces the dummy STATS/GROWTH_DATA arrays), plus
 * registrations-by-role and case-volume-by-status, which the frontend can
 * surface anywhere reasonable on the dashboard.
 */
export async function getOverview() {
  const months = trailingMonths(6);
  const earliestBucketStart = months[0].start;

  const [
    totalUsers,
    usersByRole,
    verifiedLawyers,
    verifiedMuftis,
    pendingLawyerVerifications,
    pendingMuftiVerifications,
    activeCases,
    casesByStatus,
    paymentsByStatus,
    approvedPaymentsByType,
    usersForTrend,
    approvedPaymentsForTrend,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ["role"], _count: true }),
    prisma.lawyerProfile.count({ where: { verificationStatus: "VERIFIED" } }),
    prisma.muftiProfile.count({ where: { verificationStatus: "VERIFIED" } }),
    prisma.lawyerProfile.count({ where: { verificationStatus: "PENDING_VERIFICATION" } }),
    prisma.muftiProfile.count({ where: { verificationStatus: "PENDING_VERIFICATION" } }),
    prisma.case.count({ where: { status: "ACTIVE" } }),
    prisma.case.groupBy({ by: ["status"], _count: true }),
    prisma.payment.groupBy({ by: ["status"], _count: true, _sum: { amount: true } }),
    Promise.all(
      ["consultationId", "caseId", "milestoneId", "muftiQueryId"].map((fk) =>
        prisma.payment.aggregate({
          where: { status: "APPROVED", [fk]: { not: null } },
          _count: true,
          _sum: { amount: true },
        })
      )
    ),
    prisma.user.findMany({ where: { createdAt: { gte: earliestBucketStart } }, select: { createdAt: true } }),
    prisma.payment.findMany({
      where: { status: "APPROVED", reviewedAt: { gte: earliestBucketStart } },
      select: { reviewedAt: true, amount: true },
    }),
  ]);

  // Registrations by role — every enum value present even if zero, so the
  // frontend doesn't have to guard against a missing key.
  const byRole = { CLIENT: 0, LAWYER: 0, MUFTI: 0, ADMIN: 0 };
  for (const row of usersByRole) {
    byRole[row.role] = row._count;
  }

  const caseStatusCounts = { PENDING_PAYMENT: 0, ACTIVE: 0, CLOSED: 0 };
  for (const row of casesByStatus) {
    caseStatusCounts[row.status] = row._count;
  }

  const paymentStatusCounts = zeroByStatus(["PENDING", "APPROVED", "REJECTED"]);
  for (const row of paymentsByStatus) {
    paymentStatusCounts[row.status] = { count: row._count, amount: row._sum.amount ?? 0 };
  }
  const reviewedTotal = paymentStatusCounts.APPROVED.count + paymentStatusCounts.REJECTED.count;
  const approvalRate = reviewedTotal > 0 ? Math.round((paymentStatusCounts.APPROVED.count / reviewedTotal) * 1000) / 10 : null;

  const [consultationAgg, caseAgg, milestoneAgg, muftiQueryAgg] = approvedPaymentsByType;
  const approvedByTargetType = {
    CONSULTATION: { count: consultationAgg._count, amount: consultationAgg._sum.amount ?? 0 },
    CASE: { count: caseAgg._count, amount: caseAgg._sum.amount ?? 0 },
    MILESTONE: { count: milestoneAgg._count, amount: milestoneAgg._sum.amount ?? 0 },
    MUFTI_QUERY: { count: muftiQueryAgg._count, amount: muftiQueryAgg._sum.amount ?? 0 },
  };

  // Cumulative-user + monthly-revenue trend across the trailing 6 months.
  // Cumulative baseline is (totalUsers - users created within the window),
  // then each bucket adds that month's registrations — cheaper than a
  // separate "users created before bucket start" query per bucket.
  const usersBeforeWindow = totalUsers - usersForTrend.length;
  let runningTotal = usersBeforeWindow;

  const trend = months.map(({ label, year, start, end }) => {
    const newUsers = usersForTrend.filter((u) => u.createdAt >= start && u.createdAt < end).length;
    runningTotal += newUsers;
    const revenue = approvedPaymentsForTrend
      .filter((p) => p.reviewedAt >= start && p.reviewedAt < end)
      .reduce((sum, p) => sum + p.amount, 0);
    return { month: label, year, newUsers, users: runningTotal, revenue };
  });

  const currentMonthRevenue = trend[trend.length - 1]?.revenue ?? 0;

  return {
    totals: {
      users: totalUsers,
      verifiedLawyers,
      verifiedMuftis,
      pendingVerifications: pendingLawyerVerifications + pendingMuftiVerifications,
      activeCases,
      monthlyRevenue: currentMonthRevenue,
      totalRevenue: paymentStatusCounts.APPROVED.amount,
    },
    registrations: {
      byRole,
      trend,
    },
    cases: {
      byStatus: caseStatusCounts,
    },
    payments: {
      byStatus: paymentStatusCounts,
      approvalRate,
      approvedByTargetType,
    },
  };
}

// Promoters/passives/detractors on the platform's 1-5 star scale (there's
// no 0-10 NPS-style rating collected — see Review.overallStars /
// reviewValidators.createReviewSchema). This is a deliberate proxy, not a
// literal NPS: 5 stars = promoter, 4 stars = passive, 1-3 stars =
// detractor, scored the standard NPS way (%promoters - %detractors,
// -100..100) so it's at least NPS-*shaped* and directionally meaningful.
function computeNps(distribution) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return { score: null, promoters: 0, passives: 0, detractors: 0, total: 0 };
  }
  const promoters = distribution[5] ?? 0;
  const passives = distribution[4] ?? 0;
  const detractors = (distribution[1] ?? 0) + (distribution[2] ?? 0) + (distribution[3] ?? 0);
  const score = Math.round(((promoters - detractors) / total) * 1000) / 10;
  return { score, promoters, passives, detractors, total };
}

/**
 * GET /api/admin/analytics/performance — lawyer/Mufti performance and
 * platform satisfaction/NPS. Lawyer performance reads the denormalized
 * LawyerProfile.averageRating/reviewCount (kept in sync by
 * reviewService.syncLawyerRating) rather than re-aggregating. Mufti
 * performance has no equivalent denormalized field (MuftiProfile carries
 * no rating columns — nothing else in the codebase maintains one either),
 * so it's aggregated live here from Review (context "GUIDANCE") for
 * rating, plus MuftiQuery (answered-count / average response time) as a
 * volume/responsiveness proxy that doesn't depend on lawyers having left
 * a rating yet.
 */
export async function getPerformance() {
  const [
    ratedLawyerProfiles,
    verifiedLawyersCount,
    topLawyers,
    guidanceReviewsByMufti,
    respondedQueries,
    verifiedMuftis,
    muftiGuidanceAgg,
    overallAgg,
    starDistributionRows,
    byContextRows,
  ] = await Promise.all([
    // Platform-wide lawyer rating is derived from the denormalized
    // LawyerProfile.averageRating/reviewCount (kept in sync by
    // reviewService.syncLawyerRating on every non-flagged review) rather
    // than re-aggregating Review live, so it stays consistent with the
    // "top lawyers" list below, which sorts on the same denormalized field.
    prisma.lawyerProfile.findMany({
      where: { reviewCount: { gt: 0 } },
      select: { averageRating: true, reviewCount: true },
    }),
    prisma.lawyerProfile.count({ where: { verificationStatus: "VERIFIED" } }),
    prisma.lawyerProfile.findMany({
      where: { reviewCount: { gt: 0 } },
      orderBy: [{ averageRating: "desc" }, { reviewCount: "desc" }],
      take: 5,
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.review.groupBy({
      by: ["rateeId"],
      where: { context: "GUIDANCE", isFlagged: false },
      _avg: { overallStars: true },
      _count: true,
    }),
    prisma.muftiQuery.findMany({
      where: { status: "RESPONDED", muftiId: { not: null }, respondedAt: { not: null } },
      select: { muftiId: true, createdAt: true, respondedAt: true },
    }),
    prisma.muftiProfile.findMany({
      where: { verificationStatus: "VERIFIED" },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.review.aggregate({
      where: { context: "GUIDANCE", isFlagged: false },
      _avg: { overallStars: true },
      _count: true,
    }),
    prisma.review.aggregate({ where: { isFlagged: false }, _avg: { overallStars: true }, _count: true }),
    prisma.review.groupBy({ by: ["overallStars"], where: { isFlagged: false }, _count: true }),
    prisma.review.groupBy({ by: ["context"], where: { isFlagged: false }, _avg: { overallStars: true }, _count: true }),
  ]);

  // Per-Mufti answered-query counts + average response time (hours),
  // computed in JS since Prisma can't average a date-diff in a groupBy.
  const queryStatsByMufti = new Map();
  for (const q of respondedQueries) {
    const entry = queryStatsByMufti.get(q.muftiId) ?? { answeredQueries: 0, totalHours: 0 };
    entry.answeredQueries += 1;
    entry.totalHours += (new Date(q.respondedAt) - new Date(q.createdAt)) / (1000 * 60 * 60);
    queryStatsByMufti.set(q.muftiId, entry);
  }

  const ratingByMufti = new Map(
    guidanceReviewsByMufti.map((r) => [r.rateeId, { averageRating: r._avg.overallStars, reviewCount: r._count }])
  );

  const muftiPerformance = verifiedMuftis
    .map((profile) => {
      const qStats = queryStatsByMufti.get(profile.userId);
      const rating = ratingByMufti.get(profile.userId);
      return {
        id: profile.userId,
        name: profile.user.name,
        answeredQueries: qStats?.answeredQueries ?? 0,
        avgResponseTimeHours: qStats ? Math.round((qStats.totalHours / qStats.answeredQueries) * 10) / 10 : null,
        averageRating: rating?.averageRating ?? null,
        reviewCount: rating?.reviewCount ?? 0,
      };
    })
    .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0) || b.answeredQueries - a.answeredQueries)
    .slice(0, 5);

  const totalAnsweredQueries = respondedQueries.length;
  const totalResponseHours = respondedQueries.reduce(
    (sum, q) => sum + (new Date(q.respondedAt) - new Date(q.createdAt)) / (1000 * 60 * 60),
    0
  );

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of starDistributionRows) {
    distribution[row.overallStars] = row._count;
  }

  const byContext = { CONSULTATION: null, CASE: null, GUIDANCE: null };
  const byContextCounts = { CONSULTATION: 0, CASE: 0, GUIDANCE: 0 };
  for (const row of byContextRows) {
    byContext[row.context] = row._avg.overallStars;
    byContextCounts[row.context] = row._count;
  }

  // Weighted platform-wide lawyer rating across every LawyerProfile that
  // has at least one non-flagged review, weighted by each lawyer's own
  // reviewCount so a 5-review lawyer doesn't skew the average as much as a
  // 100-review one.
  const lawyerTotalReviews = ratedLawyerProfiles.reduce((sum, p) => sum + p.reviewCount, 0);
  const lawyerWeightedStars = ratedLawyerProfiles.reduce((sum, p) => sum + p.averageRating * p.reviewCount, 0);
  const lawyerAverageRating = lawyerTotalReviews > 0 ? Math.round((lawyerWeightedStars / lawyerTotalReviews) * 100) / 100 : null;

  return {
    lawyers: {
      averageRating: lawyerAverageRating,
      totalReviews: lawyerTotalReviews,
      verifiedCount: verifiedLawyersCount,
      top: topLawyers.map((p) => ({
        id: p.userId,
        name: p.user.name,
        averageRating: p.averageRating,
        reviewCount: p.reviewCount,
      })),
    },
    muftis: {
      verifiedCount: verifiedMuftis.length,
      totalAnsweredQueries,
      avgResponseTimeHours: totalAnsweredQueries > 0 ? Math.round((totalResponseHours / totalAnsweredQueries) * 10) / 10 : null,
      averageRating: muftiGuidanceAgg._avg.overallStars,
      totalReviews: muftiGuidanceAgg._count,
      top: muftiPerformance,
    },
    satisfaction: {
      overallAverage: overallAgg._avg.overallStars,
      totalReviews: overallAgg._count,
      distribution,
      byContext,
      byContextCounts,
      nps: {
        ...computeNps(distribution),
        formula:
          "5-star reviews counted as promoters, 4-star as passive, 1-3 star as detractors; score = (%promoters - %detractors), range -100..100. Proxy for classic 0-10 NPS since LawGenie collects 1-5 star reviews, not an 0-10 likelihood-to-recommend score.",
      },
    },
  };
}

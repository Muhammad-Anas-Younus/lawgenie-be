import { z } from "zod";

const scoreField = z.coerce.number().int().min(1).max(5).optional();

export const createReviewSchema = z.object({
  rateeId: z.string().uuid(),
  context: z.enum(["CONSULTATION", "CASE", "GUIDANCE"]),
  consultationId: z.string().uuid().optional(),
  caseId: z.string().uuid().optional(),
  muftiQueryId: z.string().uuid().optional(),
  overallStars: z.coerce.number().int().min(1).max(5),
  communication: scoreField,
  expertise: scoreField,
  value: scoreField,
  professionalism: scoreField,
  responsiveness: scoreField,
  text: z.string().trim().max(2000).optional(),
});

export const listReviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

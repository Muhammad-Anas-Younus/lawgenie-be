import { z } from "zod";

// Comma-separated query params (e.g. ?languages=Urdu,English) arrive as a
// single string — normalize to an array the same way multipart fields do.
const arrayField = z.preprocess((val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string" && val.trim() !== "") {
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}, z.array(z.string()));

export const lawyerListQuerySchema = z.object({
  specialization: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  minFee: z.coerce.number().nonnegative().optional(),
  maxFee: z.coerce.number().nonnegative().optional(),
  minExperience: z.coerce.number().int().nonnegative().optional(),
  maxExperience: z.coerce.number().int().nonnegative().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  availableOn: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]).optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const lawyerUpdateSchema = z.object({
  bio: z.string().optional(),
  city: z.string().optional(),
  specialization: arrayField.optional(),
  experienceYears: z.coerce.number().int().nonnegative().optional(),
  consultationFee: z.coerce.number().int().nonnegative().optional(),
  feeStructure: z
    .object({
      retainer: z.coerce.number().nonnegative().optional(),
      milestone: z.coerce.number().nonnegative().optional(),
      hourly: z.coerce.number().nonnegative().optional(),
    })
    .partial()
    .optional(),
  availability: z.record(z.string(), z.boolean()).optional(),
  languages: arrayField.optional(),
  jurisdictions: arrayField.optional(),
});

export const lawyerRecommendationsQuerySchema = z.object({
  caseType: z.string().trim().min(1),
  budget: z.coerce.number().nonnegative().optional(),
  location: z.string().trim().min(1).optional(),
});

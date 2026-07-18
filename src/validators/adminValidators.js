import { z } from "zod";

export const reviewPaymentSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    reason: z.string().min(1).optional(),
  })
  .refine((data) => data.status !== "REJECTED" || !!data.reason, {
    message: "A reason is required when rejecting a payment.",
    path: ["reason"],
  });

export const reviewVerificationSchema = z
  .object({
    status: z.enum(["VERIFIED", "REJECTED"]),
    reason: z.string().min(1).optional(),
  })
  .refine((data) => data.status !== "REJECTED" || !!data.reason, {
    message: "A reason is required when rejecting a verification.",
    path: ["reason"],
  });

// GET /api/admin/users — the searchable/filterable user roster (11.6).
export const listUsersQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  role: z.enum(["CLIENT", "LAWYER", "MUFTI", "ADMIN"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

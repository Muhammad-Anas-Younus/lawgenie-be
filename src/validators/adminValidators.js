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

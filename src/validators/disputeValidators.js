import { z } from "zod";

export const createDisputeSchema = z.object({
  caseId: z.string().uuid(),
  reason: z.string().trim().min(1),
});

export const reviewDisputeSchema = z
  .object({
    status: z.enum(["IN_REVIEW", "RESOLVED"]),
    resolution: z.string().trim().min(1).optional(),
  })
  .refine((data) => data.status !== "RESOLVED" || !!data.resolution, {
    message: "A resolution is required when marking a dispute resolved.",
    path: ["resolution"],
  });

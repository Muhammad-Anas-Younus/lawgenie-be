import { z } from "zod";

export const createConsultationSchema = z.object({
  lawyerId: z.string().uuid(),
  // ISO datetime string for the requested meeting time.
  scheduledAt: z.coerce.date(),
});

export const createPaymentSchema = z.object({
  consultationId: z.string().uuid(),
});

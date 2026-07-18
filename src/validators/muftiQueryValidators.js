import { z } from "zod";

// Multipart request (question fields + payment screenshot file) — same
// pattern as proposals' accept endpoint.
export const createMuftiQuerySchema = z.object({
  caseId: z.string().uuid(),
  urgency: z.enum(["STANDARD", "URGENT", "CRITICAL"]),
  question: z.string().trim().min(1),
});

// PRD §6.5: response composition requires mandatory Islamic source citations.
export const respondMuftiQuerySchema = z.object({
  answer: z.string().trim().min(1),
  citations: z
    .array(z.string().trim().min(1))
    .min(1, "At least one Islamic source citation is required."),
});

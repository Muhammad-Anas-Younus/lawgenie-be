import { z } from "zod";

// Free-form terms of engagement — shape mirrors LawyerProfile.feeStructure
// (varies enough per case that a fixed relational schema isn't worth it),
// but `retainerAmount` is required since it's what gets charged as the
// Payment when the client accepts.
export const feeStructureSchema = z.object({
  caseType: z.string().trim().min(1),
  scope: z.string().trim().min(1),
  deliverables: z.array(z.string().trim().min(1)).default([]),
  retainerAmount: z.coerce.number().int().positive(),
  hearingFee: z.coerce.number().int().nonnegative().optional(),
  estimatedDuration: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const createProposalSchema = z.object({
  consultationId: z.string().uuid(),
  feeStructure: feeStructureSchema,
});

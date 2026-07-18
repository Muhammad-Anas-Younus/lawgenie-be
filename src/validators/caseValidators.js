import { z } from "zod";

// PATCH /api/cases/:id — lawyer-only progress/status/tracker updates. All
// fields optional since a caller may update just one thing at a time.
export const updateCaseSchema = z
  .object({
    progress: z.coerce.number().int().min(0).max(100).optional(),
    status: z.enum(["CLOSED"]).optional(),
    mehrAmount: z.coerce.number().int().nonnegative().optional(),
    mehrPaid: z.coerce.boolean().optional(),
    // Explicit null clears the tracker; omitted leaves it untouched.
    iddatStartDate: z.union([z.string().trim().min(1), z.null()]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field is required." });

export const createMilestoneSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  dueDate: z.coerce.date().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
});

export const updateMilestoneSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    dueDate: z.coerce.date().optional(),
    status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field is required." });

export const createHearingSchema = z.object({
  date: z.coerce.date(),
  location: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const updateHearingSchema = z
  .object({
    date: z.coerce.date().optional(),
    location: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field is required." });

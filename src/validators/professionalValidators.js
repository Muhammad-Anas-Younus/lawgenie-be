import { z } from "zod";

// multipart form fields arrive as either a single string, a repeated-field
// array, or a comma-separated string, depending on how the client encodes
// them — normalize all three to a string array.
const arrayField = z.preprocess((val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string" && val.trim() !== "") {
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}, z.array(z.string()));

export const lawyerRegisterSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().min(7).optional(),
    password: z.string().min(8),
    specialization: arrayField.optional(),
    experienceYears: z.coerce.number().int().nonnegative().optional(),
    bio: z.string().optional(),
    city: z.string().optional(),
    consultationFee: z.coerce.number().int().nonnegative().optional(),
    languages: arrayField.optional(),
    jurisdictions: arrayField.optional(),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: "Either email or phone is required.",
    path: ["email"],
  });

export const muftiRegisterSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().min(7).optional(),
    password: z.string().min(8),
    specialization: arrayField.optional(),
    bio: z.string().optional(),
    languages: arrayField.optional(),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: "Either email or phone is required.",
    path: ["email"],
  });

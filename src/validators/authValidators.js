import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().min(7).optional(),
    password: z.string().min(8),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: "Either email or phone is required.",
    path: ["email"],
  });

export const verifyOtpSchema = z.object({
  identifier: z.string().min(1),
  code: z.string().min(1),
});

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

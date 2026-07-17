import { z } from "zod";

// GET/PATCH /api/users/me/settings — shared across every role (client,
// lawyer, mufti, admin). Role-specific professional fields (bio,
// specialization, fee, etc.) live on LawyerProfile/MuftiProfile and are
// edited via PATCH /api/lawyers/me (2.2) instead, not here.
export const updateSettingsSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(7).optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(8).optional(),
    // Freeform — the frontend sends whichever toggle keys its role's
    // Settings page shows; stored/merged as-is.
    notificationPrefs: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => !data.newPassword || !!data.currentPassword, {
    message: "currentPassword is required to set a new password.",
    path: ["currentPassword"],
  });

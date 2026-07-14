import { z } from "zod";

export const sendMessageSchema = z.object({
  body: z.string().min(1),
  attachmentUrl: z.string().min(1).optional(),
});

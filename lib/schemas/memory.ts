import { z } from "zod";

export const postMemorySchema = z.object({
  scope: z.string().min(1).max(200),
  content: z.string().min(1).max(50_000),
});

export type PostMemoryBody = z.infer<typeof postMemorySchema>;

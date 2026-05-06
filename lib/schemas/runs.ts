import { z } from "zod";

export const runQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

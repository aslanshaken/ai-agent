import { z } from "zod";

/** Path param `{ id }` for UUID entity routes */
export const uuidRouteParamSchema = z.object({
  id: z.string().uuid(),
});

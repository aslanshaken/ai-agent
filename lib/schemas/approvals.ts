import { z } from "zod";

export const patchApprovalSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export type PatchApprovalBody = z.infer<typeof patchApprovalSchema>;

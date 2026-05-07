import { z } from "zod";

export const patchApprovalSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  category: z.string().min(1).max(120).optional(),
  reviewer_note: z.string().max(8000).optional(),
  reject_reason: z.string().max(8000).optional(),
  edited_payload: z.record(z.string(), z.unknown()).optional(),
});

export type PatchApprovalBody = z.infer<typeof patchApprovalSchema>;

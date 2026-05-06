import { z } from "zod";

export const nodeTypes = [
  "trigger",
  "search",
  "ai_reasoning",
  "condition",
  "approval",
  "save_to_db",
  "notification",
] as const;

export type AgentNodeType = (typeof nodeTypes)[number];

export const agentNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(nodeTypes),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()).optional().default({}),
  label: z.string().optional(),
});

export const agentEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
});

export const createAgentBodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  mission: z.string().max(8000).optional(),
  nodes: z.array(agentNodeSchema).default([]),
  edges: z.array(agentEdgeSchema).default([]),
});

export const updateAgentBodySchema = createAgentBodySchema.partial().extend({
  name: z.string().min(1).max(200).optional(),
});

export type CreateAgentBody = z.infer<typeof createAgentBodySchema>;
export type UpdateAgentBody = z.infer<typeof updateAgentBodySchema>;

import type { Edge, Node } from "reactflow";

/** Row from `public.agent_templates` (Supabase snake_case). */
export type AgentTemplateRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  default_mission: string | null;
  default_nodes: unknown;
  default_edges: unknown;
  default_schedule: unknown;
  estimated_runtime: string | null;
  tools_summary: string | null;
  schedule_hint: string | null;
};

const DISPLAY_ORDER = [
  "investor-research",
  "candidate-sourcing",
  "founder-daily-briefing",
  "startup-intelligence",
] as const;

function templateSlugOrder(slug: string): number {
  const i = (DISPLAY_ORDER as readonly string[]).indexOf(slug);
  return i === -1 ? 999 : i;
}

export function sortAgentTemplates<T extends { slug: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => templateSlugOrder(a.slug) - templateSlugOrder(b.slug));
}

function asNodeArray(v: unknown): Node[] {
  if (!Array.isArray(v)) return [];
  return v as Node[];
}

function asEdgeArray(v: unknown): Edge[] {
  if (!Array.isArray(v)) return [];
  return v as Edge[];
}

/** Maps a DB template row to `AgentBuilderClient` `initial` props. */
export function templateRowToBuilderInitial(row: AgentTemplateRow) {
  return {
    name: row.name,
    description: row.description ?? "",
    mission: row.default_mission ?? "",
    nodes: asNodeArray(row.default_nodes),
    edges: asEdgeArray(row.default_edges),
  };
}

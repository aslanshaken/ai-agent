import type { Edge, Node } from "reactflow";
import { explainWorkflowFromGraph } from "@/lib/agents/workflow-chat-helpers";

const STORAGE_VERSION = "v1";
const STORAGE_PREFIX = `founder-os-agent-chat:${STORAGE_VERSION}`;
const MAX_MESSAGES = 80;

export type StoredChatMessage = {
  id: string;
  role: "system" | "user" | "assistant" | "run";
  content: string;
};

export function agentChatStorageKey(agentId: string): string {
  return `${STORAGE_PREFIX}:${agentId}`;
}

export function loadAgentChatMessages(agentId: string): StoredChatMessage[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(agentChatStorageKey(agentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: StoredChatMessage[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      if (
        r.role !== "user" &&
        r.role !== "assistant" &&
        r.role !== "system" &&
        r.role !== "run"
      ) {
        continue;
      }
      if (typeof r.content !== "string") continue;
      const id = typeof r.id === "string" && r.id.trim() ? r.id : crypto.randomUUID();
      out.push({
        id,
        role: r.role as StoredChatMessage["role"],
        content: r.content,
      });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

export function saveAgentChatMessages(agentId: string, messages: StoredChatMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed =
      messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages;
    window.localStorage.setItem(agentChatStorageKey(agentId), JSON.stringify(trimmed));
  } catch {
    /* quota or private mode */
  }
}

export function buildWelcomeChatMessages(
  agentId: string,
  agentName: string,
  nodes: Node[],
  edges: Edge[],
): StoredChatMessage[] {
  const wf = explainWorkflowFromGraph(nodes, edges);
  const content = [
    `Welcome to ${agentName.trim() || "your agent"}.`,
    "",
    "Quick controls:",
    "• Run agent — runs your workflow end-to-end (search, AI steps, approvals, saves).",
    "• Workflow — edit nodes on the canvas (auto-saves).",
    "• Details — name, description, mission.",
    "• Runs / Approvals (header) — history and human review.",
    "",
    wf,
    "",
    'Ask anything, or type "run" to execute this workflow.',
  ].join("\n");

  return [
    {
      id: `welcome:${agentId}`,
      role: "assistant",
      content,
    },
  ];
}

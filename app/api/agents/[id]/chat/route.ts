import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { Edge, Node } from "reactflow";
import { explainWorkflowFromGraph } from "@/lib/agents/workflow-chat-helpers";
import { uuidRouteParamSchema } from "@/lib/schemas/route-params";
import { exaSearch } from "@/lib/tools/search/exa-search";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const chatBodySchema = z.object({
  message: z.string().min(1).max(8000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(12000),
      }),
    )
    .max(24)
    .optional()
    .default([]),
});

async function getLatestVersionId(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  agentId: string,
) {
  const { data, error } = await supabase
    .from("agent_versions")
    .select("id")
    .eq("agent_id", agentId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data?.id ?? null;
}

function wantsLiveContext(message: string): boolean {
  const t = message.trim();
  if (t.length < 4) return false;
  return /\b(search|look\s*up|find\s+(online|on\s+the\s+web)|latest|current(\s+news|\s+info)?|who\s+(are|is)|what\s+(are|is)\s+the|investors?\s+(for|in)|news\s+about|check\s+(the\s+)?web|scrape|real[\s-]?time)\b/i.test(
    t,
  );
}

async function optionalExaContext(message: string): Promise<string | null> {
  if (!process.env.EXA_API_KEY?.trim() || !wantsLiveContext(message)) return null;
  try {
    const q = message.slice(0, 280);
    const result = await exaSearch(q, 6);
    if (!result.results?.length) return null;
    const lines = result.results.map(
      (r, i) =>
        `${i + 1}. ${r.title}\n   ${r.snippet?.slice(0, 420) ?? ""}\n   ${r.url}`,
    );
    return `Fresh web results (Exa) — use as grounding; cite URLs when relevant:\n${lines.join("\n\n")}`;
  } catch {
    return null;
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const parsedParams = uuidRouteParamSchema.safeParse(await ctx.params);
    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid agent id" }, { status: 400 });
    }
    const { id: agentId } = parsedParams.data;

    const json = await req.json().catch(() => null);
    const parsedBody = chatBodySchema.safeParse(json);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const { message, history } = parsedBody.data;

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured on the server." },
        { status: 503 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: agent, error: aErr } = await supabase
      .from("agents")
      .select("id, name, description, mission")
      .eq("id", agentId)
      .eq("user_id", user.id)
      .single();

    if (aErr || !agent) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const versionId = await getLatestVersionId(supabase, agentId);
    let workflowExplain =
      "Workflow graph not loaded — open Workflow to edit nodes.";
    if (versionId) {
      const { data: nodeRows } = await supabase
        .from("agent_nodes")
        .select("react_flow_id, type, label, position_x, position_y, data")
        .eq("version_id", versionId);
      const { data: edgeRows } = await supabase
        .from("agent_edges")
        .select("react_flow_id, source_node, target_node, source_handle, target_handle")
        .eq("version_id", versionId);

      const nodes: Node[] =
        nodeRows?.map((n) => ({
          id: n.react_flow_id,
          type: n.type ?? "default",
          position: { x: n.position_x, y: n.position_y },
          data: { ...(typeof n.data === "object" && n.data ? n.data : {}), label: n.label },
        })) ?? [];

      const edges: Edge[] =
        edgeRows?.map((e) => ({
          id: e.react_flow_id,
          source: e.source_node,
          target: e.target_node,
          sourceHandle: e.source_handle ?? undefined,
          targetHandle: e.target_handle ?? undefined,
        })) ?? [];

      workflowExplain = explainWorkflowFromGraph(nodes, edges);
    }

    const exaBlock = await optionalExaContext(message);

    const system = [
      `You are the in-product copilot for the workflow agent "${agent.name}".`,
      agent.description?.trim()
        ? `Short description: ${agent.description.trim()}`
        : null,
      agent.mission?.trim()
        ? `Mission / objective: ${agent.mission.trim()}`
        : null,
      `Workflow summary: ${workflowExplain}`,
      "Keep replies short and scannable: prefer a brief intro plus bullets naming UI controls (Run agent, Workflow, Details, Runs, Approvals).",
      "Main UI affordances: Run agent runs their saved workflow on the server (search nodes, AI reasoning, approvals, saves). Workflow opens the canvas editor (auto-save). Details edits name/description/mission. Header: Runs and Approvals for history and review.",
      "When they ask you to find investors, run research, or fetch results: steer them to Run agent or typing \"run\" in chat — that executes their workflow. Do not refuse with \"I can't search\" or imply nothing can run; you don't execute runs yourself, but they do from this screen.",
      "If optional \"Fresh web results (Exa)\" appear below, use them only as supplemental grounding for general questions — they are not a substitute for clicking Run agent to execute their configured workflow.",
      "Editing: They apply changes in the app — Workflow for nodes/edges and Details for copy. Offer concrete queries, prompts, and node settings they can paste. You cannot PATCH the database from chat.",
      "If they ask whether chat alone updates the agent: changes happen when they edit Workflow / Details (and similar drawers); you guide what to change.",
      "Chat shortcuts they can try: run, save, explain workflow, latest run, open workflow, open details.",
      "Do not invent API keys. Do not claim you clicked Run agent or finished their workflow for them.",
      exaBlock ? `\n${exaBlock}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const model =
      process.env.OPENAI_AGENT_CHAT_MODEL?.trim() ||
      process.env.OPENAI_REASONING_MODEL?.trim() ||
      "gpt-4o-mini";

    const client = new OpenAI({ apiKey });

    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      ...history.map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: message },
    ];

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.45,
      max_tokens: 1200,
      messages: openaiMessages,
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) {
      return NextResponse.json({ error: "Empty model response" }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

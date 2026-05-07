"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Edge, Node } from "reactflow";
import {
  AgentFlowEditor,
  type AgentFlowEditorHandle,
} from "@/components/graph/agent-flow-editor";
import { AgentHeader, type WorkspaceHeaderStatus } from "@/components/agents/agent-header";
import {
  AgentChatPanel,
  type ChatMessage,
} from "@/components/agents/agent-chat-panel";
import { AgentWorkflowDrawer } from "@/components/agents/agent-workflow-drawer";
import { AgentDetailsDrawer } from "@/components/agents/agent-details-drawer";
import { AgentMemoryPermissionsDrawer } from "@/components/agents/agent-memory-permissions-drawer";
import { AgentScheduleDrawer } from "@/components/agents/agent-schedule-drawer";
import { buildAgentPatchBody } from "@/lib/agents/build-agent-patch-body";
import type { AgentBuilderInitial } from "@/components/agents/agent-builder-client";
import type { TimelineStep } from "@/components/agents/agent-run-timeline";
import { parseChatCommand } from "@/lib/agents/chat-command-parser";
import {
  analyzeWorkflowHealth,
  explainWorkflowFromGraph,
  stepCompletionChatMessage,
  suggestWorkflowImprovements,
} from "@/lib/agents/workflow-chat-helpers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type RunPollPayload = {
  pendingApproval: { id: string } | null;
  run: {
    id: string;
    status: string;
    error: string | null;
    output: unknown;
  };
  steps: TimelineStep[];
};

const POLL_STOP = new Set([
  "completed",
  "failed",
  "cancelled",
  "waiting_for_approval",
]);

function digestFields(p: {
  name: string;
  description: string;
  mission: string;
  memoryCategoriesText: string;
  allowedNodeTypesText: string;
  riskLevel: string;
}) {
  return JSON.stringify(p);
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`;
  }
  if (parts.length === 1 && parts[0]!.length >= 2) {
    return parts[0]!.slice(0, 2);
  }
  return name.slice(0, 2) || "A";
}

function formatRunPayloadSummary(data: RunPollPayload): string {
  const st = data.run.status;
  const steps = data.steps?.length ?? 0;
  let out = `Run ${data.run.id.slice(0, 8)}… — status: ${st.replace(/_/g, " ")}. Steps: ${steps}.`;
  if (data.run.error) out += `\nError: ${data.run.error}`;
  if (data.run.output != null && st === "completed") {
    const o = data.run.output;
    const snippet =
      typeof o === "object" ? JSON.stringify(o, null, 2).slice(0, 900) : String(o);
    out += `\n\nOutput:\n${snippet}${snippet.length >= 900 ? "\n…" : ""}`;
  }
  return out;
}

export function AgentWorkspace({
  agentId,
  initial,
  pendingApprovalsCount,
  scheduleEnabled,
  latestRun,
}: {
  agentId: string;
  initial: AgentBuilderInitial & { nodes: Node[]; edges: Edge[] };
  pendingApprovalsCount: number;
  scheduleEnabled: boolean;
  latestRun: { id: string; status: string } | null;
}) {
  const router = useRouter();
  const editorRef = useRef<AgentFlowEditorHandle>(null);
  const announcedStepKeysRef = useRef(new Set<string>());

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [mission, setMission] = useState(initial?.mission ?? "");
  const [memoryCategoriesText, setMemoryCategoriesText] = useState(() =>
    (initial?.memory_categories ?? []).join("\n"),
  );
  const [allowedNodeTypesText, setAllowedNodeTypesText] = useState(() => {
    const raw = initial?.permission_profile?.allowed_node_types;
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").join(", ") : "";
  });
  const [riskLevel, setRiskLevel] = useState<string>(() => {
    const r = initial?.permission_profile?.risk_level;
    return r === "low" || r === "medium" || r === "high" ? r : "";
  });

  const lastSaved = useRef({
    fields: digestFields({
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      mission: initial?.mission ?? "",
      memoryCategoriesText: (initial?.memory_categories ?? []).join("\n"),
      allowedNodeTypesText: (() => {
        const raw = initial?.permission_profile?.allowed_node_types;
        return Array.isArray(raw)
          ? raw.filter((x): x is string => typeof x === "string").join(", ")
          : "";
      })(),
      riskLevel:
        initial?.permission_profile?.risk_level === "low" ||
        initial?.permission_profile?.risk_level === "medium" ||
        initial?.permission_profile?.risk_level === "high"
          ? (initial.permission_profile.risk_level as string)
          : "",
    }),
    graph: JSON.stringify({
      nodes: initial?.nodes ?? [],
      edges: initial?.edges ?? [],
    }),
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "intro",
      role: "system",
      content: `${initial?.name ?? "This agent"} — ask in plain language or use the shortcuts. Run or save from chat, explain the workflow, summarize the last run, check approvals, or get improvement ideas.`,
    },
  ]);

  const [pollRunId, setPollRunId] = useState<string | null>(null);
  const [approvalPause, setApprovalPause] = useState(false);
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);
  const [runPoll, setRunPoll] = useState<RunPollPayload | null>(null);
  const lastPollRef = useRef<RunPollPayload | null>(null);
  const [graphEpoch, setGraphEpoch] = useState(0);
  const [chatBusy, setChatBusy] = useState(false);

  useEffect(() => {
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setMission(initial?.mission ?? "");
    setMemoryCategoriesText((initial?.memory_categories ?? []).join("\n"));
    const raw = initial?.permission_profile?.allowed_node_types;
    setAllowedNodeTypesText(
      Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").join(", ") : "",
    );
    const r = initial?.permission_profile?.risk_level;
    setRiskLevel(r === "low" || r === "medium" || r === "high" ? r : "");
    lastSaved.current.fields = digestFields({
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      mission: initial?.mission ?? "",
      memoryCategoriesText: (initial?.memory_categories ?? []).join("\n"),
      allowedNodeTypesText: Array.isArray(raw)
        ? raw.filter((x): x is string => typeof x === "string").join(", ")
        : "",
      riskLevel: r === "low" || r === "medium" || r === "high" ? r : "",
    });
    lastSaved.current.graph = JSON.stringify({
      nodes: initial?.nodes ?? [],
      edges: initial?.edges ?? [],
    });
  }, [
    initial?.name,
    initial?.description,
    initial?.mission,
    initial?.memory_categories,
    initial?.permission_profile,
    initial?.nodes,
    initial?.edges,
    agentId,
  ]);

  const currentFieldsDigest = digestFields({
    name,
    description,
    mission,
    memoryCategoriesText,
    allowedNodeTypesText,
    riskLevel,
  });

  const currentGraphDigest = (): string => {
    const snap = editorRef.current?.getSnapshot();
    if (snap) return JSON.stringify(snap);
    return JSON.stringify({
      nodes: initial?.nodes ?? [],
      edges: initial?.edges ?? [],
    });
  };

  const dirty = useMemo(() => {
    void graphEpoch;
    return (
      currentFieldsDigest !== lastSaved.current.fields ||
      currentGraphDigest() !== lastSaved.current.graph
    );
  }, [
    graphEpoch,
    currentFieldsDigest,
    name,
    description,
    mission,
    memoryCategoriesText,
    allowedNodeTypesText,
    riskLevel,
    initial?.nodes,
    initial?.edges,
  ]);

  const workflowSnapshot = useMemo(() => {
    void graphEpoch;
    const snap = editorRef.current?.getSnapshot();
    if (snap) return snap;
    return {
      nodes: initial?.nodes ?? [],
      edges: initial?.edges ?? [],
    };
  }, [graphEpoch, initial?.nodes, initial?.edges]);

  const health = useMemo(
    () => analyzeWorkflowHealth(workflowSnapshot.nodes),
    [workflowSnapshot],
  );

  const persist = useCallback(
    async (options?: {
      showBanner?: boolean;
    }): Promise<{ ok: boolean; error?: string }> => {
      const showBanner = options?.showBanner !== false;
      if (showBanner) setMessage(null);
      const snap = editorRef.current?.getSnapshot();
      if (!snap) {
        const err = "Open Workflow and wait for the editor to load, then try again.";
        if (showBanner) setMessage(err);
        return { ok: false, error: err };
      }
      let body: Record<string, unknown>;
      try {
        body = buildAgentPatchBody(
          {
            name,
            description,
            mission,
            memoryCategoriesText,
            allowedNodeTypesText,
            riskLevel,
          },
          snap,
          agentId,
        );
      } catch (e) {
        const err = e instanceof Error ? e.message : "Invalid data";
        if (showBanner) setMessage(err);
        return { ok: false, error: err };
      }

      setSaving(true);
      try {
        const res = await fetch(`/api/agents/${agentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Save failed");
        lastSaved.current.fields = digestFields({
          name,
          description,
          mission,
          memoryCategoriesText,
          allowedNodeTypesText,
          riskLevel,
        });
        lastSaved.current.graph = JSON.stringify(snap);
        if (showBanner) setMessage("Saved.");
        router.refresh();
        return { ok: true };
      } catch (e) {
        const err = e instanceof Error ? e.message : "Save failed";
        if (showBanner) setMessage(err);
        return { ok: false, error: err };
      } finally {
        setSaving(false);
      }
    },
    [
      agentId,
      allowedNodeTypesText,
      description,
      memoryCategoriesText,
      mission,
      name,
      riskLevel,
      router,
    ],
  );

  const appendChat = useCallback((msg: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { ...msg, id: crypto.randomUUID() }]);
  }, []);

  const runAgent = useCallback(
    async (opts?: { silent?: boolean }) => {
      setMessage(null);
      announcedStepKeysRef.current.clear();
      try {
        const res = await fetch(`/api/agents/${agentId}/run`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Run failed");
        const rid = data.runId as string | undefined;
        if (!rid) throw new Error("No run id returned");
        if (!opts?.silent) {
          appendChat({ role: "assistant", content: "Run started." });
        }
        lastPollRef.current = null;
        setPollRunId(rid);
        setApprovalPause(false);
        setPendingApprovalId(null);
        setRunPoll(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Run failed";
        if (!opts?.silent) setMessage(msg);
        appendChat({
          role: "assistant",
          content: msg.endsWith(".") ? msg : `${msg}.`,
        });
      }
    },
    [agentId, appendChat],
  );

  useEffect(() => {
    if (!pollRunId || approvalPause) return;

    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch(`/api/runs/${pollRunId}`);
        const data = (await res.json()) as RunPollPayload & { error?: string };
        if (!res.ok || cancelled) return;

        const prev = lastPollRef.current;
        lastPollRef.current = data;
        setRunPoll(data);

        const st = data.run.status;
        const prevSt = prev?.run.status;

        for (const s of data.steps) {
          if (s.status !== "completed") continue;
          const key = `${s.step_index}:${s.node_id}:completed`;
          if (announcedStepKeysRef.current.has(key)) continue;
          announcedStepKeysRef.current.add(key);
          const line = stepCompletionChatMessage(s);
          if (line) appendChat({ role: "assistant", content: line });
        }

        if (st === "waiting_for_approval") {
          if (prevSt !== "waiting_for_approval") {
            setApprovalPause(true);
            setPendingApprovalId(data.pendingApproval?.id ?? null);
            appendChat({
              role: "assistant",
              content: "Waiting for approval.",
            });
          }
          return;
        }

        if (st !== prevSt && POLL_STOP.has(st)) {
          setPollRunId(null);
          setApprovalPause(false);
          if (st === "completed") {
            const out = data.run.output;
            const summary =
              out && typeof out === "object"
                ? JSON.stringify(out, null, 2).slice(0, 1200)
                : String(out ?? "Done.");
            appendChat({
              role: "assistant",
              content: `Run completed.\n\n${summary}${summary.length >= 1200 ? "\n…" : ""}`,
            });
          } else if (st === "failed" || st === "cancelled") {
            appendChat({
              role: "assistant",
              content: `Run ${st.replace(/_/g, " ")}${data.run.error ? `: ${data.run.error}` : ""}.`,
            });
          }
        }
      } catch {
        /* ignore */
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollRunId, approvalPause, appendChat]);

  const resolveLatestRunSummary = useCallback(async (): Promise<string> => {
    if (runPoll?.run.id) {
      return formatRunPayloadSummary(runPoll);
    }
    if (latestRun?.id) {
      try {
        const res = await fetch(`/api/runs/${latestRun.id}`);
        const data = (await res.json()) as RunPollPayload & { error?: string };
        if (!res.ok) return "Could not load the latest run.";
        return formatRunPayloadSummary(data);
      } catch {
        return "Could not load the latest run.";
      }
    }
    return "No runs yet for this agent. Type run in chat to start one.";
  }, [runPoll, latestRun]);

  const dispatchCommand = useCallback(
    async (raw: string) => {
      const { intent } = parseChatCommand(raw);
      const snap = editorRef.current?.getSnapshot() ?? {
        nodes: (initial?.nodes ?? []) as Node[],
        edges: (initial?.edges ?? []) as Edge[],
      };

      switch (intent) {
        case "save_agent": {
          const result = await persist({ showBanner: false });
          appendChat({
            role: "assistant",
            content: result.ok ? "All changes saved." : (result.error ?? "Save failed."),
          });
          return;
        }
        case "run_agent":
          appendChat({ role: "assistant", content: "Starting a run now." });
          await runAgent({ silent: true });
          return;
        case "explain_workflow":
          appendChat({
            role: "assistant",
            content: explainWorkflowFromGraph(snap.nodes, snap.edges),
          });
          return;
        case "latest_run_summary":
          appendChat({
            role: "assistant",
            content: await resolveLatestRunSummary(),
          });
          return;
        case "pending_approval":
          if (
            pendingApprovalId ||
            runPoll?.run.status === "waiting_for_approval"
          ) {
            appendChat({
              role: "assistant",
              content:
                "There is a pending approval on the current run — use the approval card below.",
            });
          } else if (pendingApprovalsCount > 0) {
            appendChat({
              role: "assistant",
              content: `This agent has ${pendingApprovalsCount} pending approval(s). Open Approvals in the sidebar for the full inbox.`,
            });
          } else {
            appendChat({
              role: "assistant",
              content: "No pending approval right now.",
            });
          }
          return;
        case "improve_workflow": {
          const tips = suggestWorkflowImprovements(snap.nodes, snap.edges, scheduleEnabled);
          const body =
            tips.length > 0
              ? `Suggestions:\n${tips.map((t) => `• ${t}`).join("\n")}`
              : "Graph looks reasonable — open Workflow to iterate.";
          appendChat({ role: "assistant", content: body });
          return;
        }
        case "open_workflow":
          setWorkflowOpen(true);
          appendChat({ role: "assistant", content: "Opening Workflow." });
          return;
        case "open_schedule":
          setScheduleOpen(true);
          appendChat({ role: "assistant", content: "Opening Schedule." });
          return;
        case "open_details":
          setDetailsOpen(true);
          appendChat({ role: "assistant", content: "Opening Details." });
          return;
        case "open_memory_permissions":
          setMemoryOpen(true);
          appendChat({ role: "assistant", content: "Opening Memory & Permissions." });
          return;
        default:
          appendChat({
            role: "assistant",
            content:
              "I can run or save this agent, explain the workflow, summarize the latest run, show pending approvals, suggest improvements, or open Workflow / Schedule / Details / Memory. Try the quick actions below.",
          });
      }
    },
    [
      appendChat,
      initial?.edges,
      initial?.nodes,
      pendingApprovalId,
      pendingApprovalsCount,
      persist,
      resolveLatestRunSummary,
      runAgent,
      runPoll?.run.status,
      scheduleEnabled,
    ],
  );

  const handleMessageInput = useCallback(
    async (text: string) => {
      appendChat({ role: "user", content: text });
      setChatBusy(true);
      try {
        await dispatchCommand(text);
      } finally {
        setChatBusy(false);
      }
    },
    [appendChat, dispatchCommand],
  );

  const headerStatus: WorkspaceHeaderStatus = useMemo(() => {
    if (approvalPause || runPoll?.run.status === "waiting_for_approval") {
      return "waiting_for_approval";
    }
    if (
      pollRunId &&
      (runPoll?.run.status === "running" ||
        runPoll?.run.status === "pending" ||
        !runPoll)
    ) {
      return "running";
    }
    if (dirty) return "unsaved";
    return "saved";
  }, [pollRunId, runPoll?.run.status, dirty, approvalPause]);

  const handleApprovalResolved = async () => {
    setPendingApprovalId(null);
    setApprovalPause(false);
    const rid = pollRunId ?? lastPollRef.current?.run.id;
    if (!rid) return;
    try {
      const res = await fetch(`/api/runs/${rid}`);
      const data = (await res.json()) as RunPollPayload;
      if (res.ok) {
        lastPollRef.current = data;
        setRunPoll(data);
      }
    } catch {
      /* ignore */
    }
  };

  const timelineSteps = runPoll?.steps ?? [];

  const latestRunDisplay = runPoll
    ? runPoll.run
    : latestRun
      ? { id: latestRun.id, status: latestRun.status, error: null as string | null }
      : null;

  const displayRunStatus = runPoll?.run.status ?? latestRun?.status ?? null;

  return (
    <div className="space-y-6">
      <AgentHeader
        name={name}
        initials={initialsFromName(name)}
        status={headerStatus}
        onWorkflow={() => setWorkflowOpen(true)}
        onDetails={() => setDetailsOpen(true)}
        onSchedule={() => setScheduleOpen(true)}
        onMemory={() => setMemoryOpen(true)}
      />

      {message ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{message}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <AgentChatPanel
          messages={messages}
          onSendMessage={handleMessageInput}
          onQuickAction={handleMessageInput}
          timelineSteps={timelineSteps}
          runStatus={runPoll?.run.status ?? null}
          approvalId={pendingApprovalId}
          onApprovalResolved={handleApprovalResolved}
          isProcessing={chatBusy}
        />

        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Workflow health</CardTitle>
              <CardDescription>From the current graph.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <p>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">Nodes:</span>{" "}
                {health.nodeCount}
              </p>
              <p>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">Approval node:</span>{" "}
                {health.hasApprovalNode ? "yes" : "no"}
              </p>
              <p>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">save_to_db:</span>{" "}
                {health.hasSaveToDb ? "yes" : "no"}
              </p>
              <p>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">Schedule:</span>{" "}
                {scheduleEnabled ? "enabled" : "off"}
              </p>
              <p>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">Last run:</span>{" "}
                <span className="capitalize">{displayRunStatus?.replace(/_/g, " ") ?? "—"}</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Approvals</CardTitle>
              <CardDescription>Pending steps for this agent.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{pendingApprovalsCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Latest run</CardTitle>
              <CardDescription>Active session or last saved run.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              {latestRunDisplay ? (
                <>
                  <p className="font-mono text-xs text-zinc-500">
                    {latestRunDisplay.id.slice(0, 8)}…
                  </p>
                  <p className="capitalize text-zinc-900 dark:text-zinc-100">
                    {latestRunDisplay.status.replace(/_/g, " ")}
                  </p>
                  {"error" in latestRunDisplay && latestRunDisplay.error ? (
                    <p className="text-xs text-red-600">{latestRunDisplay.error}</p>
                  ) : null}
                </>
              ) : (
                <p className="text-zinc-500">No runs yet.</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      <AgentWorkflowDrawer
        open={workflowOpen}
        onClose={() => {
          setWorkflowOpen(false);
          setGraphEpoch((n) => n + 1);
        }}
        onSaveWorkflow={() => void persist()}
        saving={saving}
      >
        <AgentFlowEditor
          ref={editorRef}
          key={agentId}
          initialNodes={initial?.nodes}
          initialEdges={initial?.edges}
        />
      </AgentWorkflowDrawer>

      <AgentDetailsDrawer
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        name={name}
        description={description}
        mission={mission}
        onChangeName={setName}
        onChangeDescription={setDescription}
        onChangeMission={setMission}
        onSave={() => {
          void persist();
          setDetailsOpen(false);
        }}
        saving={saving}
      />

      <AgentMemoryPermissionsDrawer
        open={memoryOpen}
        onClose={() => setMemoryOpen(false)}
        memoryCategoriesText={memoryCategoriesText}
        allowedNodeTypesText={allowedNodeTypesText}
        riskLevel={riskLevel}
        onChangeMemoryCategoriesText={setMemoryCategoriesText}
        onChangeAllowedNodeTypesText={setAllowedNodeTypesText}
        onChangeRiskLevel={setRiskLevel}
        onSave={() => {
          void persist();
          setMemoryOpen(false);
        }}
        saving={saving}
      />

      <AgentScheduleDrawer
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        agentId={agentId}
      />
    </div>
  );
}

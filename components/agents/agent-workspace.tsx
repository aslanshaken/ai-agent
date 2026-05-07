"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { AgentRunsDrawer } from "@/components/agents/agent-runs-drawer";
import { AgentApprovalsDrawer } from "@/components/agents/agent-approvals-drawer";
import { buildAgentPatchBody } from "@/lib/agents/build-agent-patch-body";
import type { AgentBuilderInitial } from "@/components/agents/agent-builder-client";
import type { TimelineStep } from "@/components/agents/agent-run-timeline";
import { parseChatCommand } from "@/lib/agents/chat-command-parser";
import {
  explainWorkflowFromGraph,
  stepCompletionChatMessage,
  suggestWorkflowImprovements,
} from "@/lib/agents/workflow-chat-helpers";
import { formatFriendlyRunSummary } from "@/lib/runs/run-output-summary";
import {
  buildWelcomeChatMessages,
  loadAgentChatMessages,
  saveAgentChatMessages,
} from "@/lib/agents/agent-chat-storage";

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
  const steps = data.steps.map((s) => ({ output: s.output }));
  return formatFriendlyRunSummary({
    runId: data.run.id,
    status: data.run.status,
    error: data.run.error,
    output: data.run.output,
    steps,
  });
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
  const [runsDrawerOpen, setRunsDrawerOpen] = useState(false);
  const [approvalsDrawerOpen, setApprovalsDrawerOpen] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  /** Hydrate transcript before paint when possible; restore prior session from localStorage. */
  useLayoutEffect(() => {
    const stored = loadAgentChatMessages(agentId);
    setMessages(
      stored?.length
        ? stored
        : buildWelcomeChatMessages(
            agentId,
            initial?.name ?? "Agent",
            initial?.nodes ?? [],
            initial?.edges ?? [],
          ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- welcome seed uses `initial` from this agent mount only.
  }, [agentId]);

  useEffect(() => {
    if (messages.length === 0) return;
    saveAgentChatMessages(agentId, messages);
  }, [messages, agentId]);

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
            appendChat({
              role: "assistant",
              content: formatFriendlyRunSummary({
                runId: data.run.id,
                status: data.run.status,
                error: data.run.error,
                output: data.run.output,
                steps: data.steps.map((s) => ({ output: s.output })),
              }),
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
    async (
      raw: string,
      priorHistory: { role: "user" | "assistant"; content: string }[],
    ) => {
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
          appendChat({
            role: "assistant",
            content:
              "Starting a run — same as the Run agent button. Watch the timeline below; open Runs in the header for the full report.",
          });
          await runAgent({ silent: true });
          return;
        case "explain_workflow":
          appendChat({
            role: "assistant",
            content: [
              explainWorkflowFromGraph(snap.nodes, snap.edges),
              "",
              "In this workspace:",
              "• Run agent — runs the full workflow (search, AI steps, approval, saves).",
              "• Workflow — edit nodes and queries on the canvas (auto-saves).",
              "• Details — name, description, mission.",
              "• Memory & Permissions / Schedule — memory scopes, risk, timing.",
              "• Runs / Approvals (header) — history and human review.",
            ].join("\n"),
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
                "There is a pending approval on the current run — follow the prompts in the chat panel, or open Approvals in the header.",
            });
          } else if (pendingApprovalsCount > 0) {
            appendChat({
              role: "assistant",
              content: `This agent has ${pendingApprovalsCount} pending approval(s). Open Approvals in the header for the full inbox.`,
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
        default: {
          try {
            const res = await fetch(`/api/agents/${agentId}/chat`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ message: raw, history: priorHistory }),
            });
            const data = (await res.json()) as { reply?: string; error?: string };
            if (!res.ok) {
              appendChat({
                role: "assistant",
                content: data.error ?? "Could not get a reply from the assistant.",
              });
              return;
            }
            appendChat({
              role: "assistant",
              content: data.reply ?? "No reply returned.",
            });
          } catch {
            appendChat({
              role: "assistant",
              content:
                "Could not reach the assistant. Check your connection, OpenAI API key, and try again.",
            });
          }
          return;
        }
      }
    },
    [
      agentId,
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
      const priorHistory = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-12)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      appendChat({ role: "user", content: text });
      setChatBusy(true);
      try {
        await dispatchCommand(text, priorHistory);
      } finally {
        setChatBusy(false);
      }
    },
    [appendChat, dispatchCommand, messages],
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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 space-y-4 border-b border-zinc-200 px-6 pb-4 pt-6 dark:border-zinc-800">
        <AgentHeader
          name={name}
          initials={initialsFromName(name)}
          status={headerStatus}
          pendingApprovalsCount={pendingApprovalsCount}
          onWorkflow={() => setWorkflowOpen(true)}
          onDetails={() => setDetailsOpen(true)}
          onSchedule={() => setScheduleOpen(true)}
          onMemory={() => setMemoryOpen(true)}
          onRuns={() => {
            setApprovalsDrawerOpen(false);
            setRunsDrawerOpen(true);
          }}
          onApprovals={() => {
            setRunsDrawerOpen(false);
            setApprovalsDrawerOpen(true);
          }}
        />

        {message ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{message}</p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <AgentChatPanel
          messages={messages}
          onSendMessage={handleMessageInput}
          timelineSteps={timelineSteps}
          runStatus={runPoll?.run.status ?? null}
          approvalId={pendingApprovalId}
          onApprovalResolved={handleApprovalResolved}
          isProcessing={chatBusy}
        />
      </div>

      <AgentWorkflowDrawer
        open={workflowOpen}
        onClose={() => {
          setWorkflowOpen(false);
          setGraphEpoch((n) => n + 1);
        }}
      >
        <AgentFlowEditor
          ref={editorRef}
          key={agentId}
          initialNodes={initial?.nodes}
          initialEdges={initial?.edges}
          onGraphChange={() => void persist({ showBanner: false })}
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

      <AgentRunsDrawer
        open={runsDrawerOpen}
        onClose={() => setRunsDrawerOpen(false)}
        agentId={agentId}
      />
      <AgentApprovalsDrawer
        open={approvalsDrawerOpen}
        onClose={() => setApprovalsDrawerOpen(false)}
        agentId={agentId}
      />
    </div>
  );
}

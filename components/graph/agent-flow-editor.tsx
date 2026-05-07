"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Plus } from "lucide-react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Panel,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { WorkflowNode } from "./workflow-node";
import { Modal } from "@/components/ui/modal";
import type { AgentNodeType } from "@/lib/schemas/agents";
import { nodeTypes as allowedNodeTypes } from "@/lib/schemas/agents";
import {
  defaultPayloadForNodeType,
  pickDefaultAttachParent,
} from "@/lib/graph/workflow-add-node";
import {
  WORKFLOW_LAYOUT_BASE_X,
  WORKFLOW_LAYOUT_BASE_Y,
  dedupeNodesByIdPreserveOrder,
  layoutWorkflowLeftToRight,
} from "@/lib/graph/layout-workflow-nodes";
import { cn } from "@/lib/utils/cn";

const rfNodeTypes = Object.fromEntries(
  allowedNodeTypes.map((t) => [t, WorkflowNode]),
);

export type FlowSnapshot = {
  nodes: Node[];
  edges: Edge[];
};

export type AgentFlowEditorHandle = {
  getSnapshot: () => FlowSnapshot;
};

type Props = {
  className?: string;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  /** When false, the drawer is hidden — skip expensive fitView until opened. */
  workflowDrawerOpen?: boolean;
  /** Called after local edits (debounced). Used for auto-save. */
  onGraphChange?: (snapshot: FlowSnapshot) => void;
};

/** Fingerprint for server `initial*` props — ids, types, data, edges (not x/y; layout is always recomputed). */
function graphPropsFingerprint(nodes?: Node[], edges?: Edge[]): string {
  const n = (nodes ?? [])
    .map((x) => {
      const payload = JSON.stringify(x.data ?? {});
      return `${x.id}:${String(x.type)}:${payload}`;
    })
    .sort()
    .join("|");
  const e = (edges ?? [])
    .map((x) => `${String(x.id)}:${x.source}->${x.target}`)
    .sort()
    .join("|");
  return `${n}##${e}`;
}

const selectLike =
  "nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900";

function formatNodeTypeOption(t: string): string {
  return t.replace(/_/g, " ");
}

function WorkflowToolbar({
  nodes,
  edges,
  onAddNode,
  onReorganize,
}: {
  nodes: Node[];
  edges: Edge[];
  onAddNode: (type: AgentNodeType, attachAfterId: string | null) => void;
  onReorganize: () => void;
}) {
  const { fitView } = useReactFlow();
  const [addOpen, setAddOpen] = useState(false);
  const [pickType, setPickType] = useState<AgentNodeType>("search");
  const [attachAfterId, setAttachAfterId] = useState<string>("");

  const typesAvailable = useMemo(() => {
    const hasTrigger = nodes.some((n) => n.type === "trigger");
    return allowedNodeTypes.filter((t) => (hasTrigger ? t !== "trigger" : true));
  }, [nodes]);

  const attachChoices = useMemo(() => {
    const unique = dedupeNodesByIdPreserveOrder(nodes);
    const laid = layoutWorkflowLeftToRight(unique, edges);
    const rows = laid.map((n) => {
      const lab = (n.data as { label?: string } | undefined)?.label;
      const subtitle = formatNodeTypeOption(String(n.type ?? ""));
      const title =
        typeof lab === "string" && lab.trim()
          ? lab.trim()
          : formatNodeTypeOption(String(n.type ?? ""));
      return { id: n.id, title, subtitle };
    });
    const pairCounts = new Map<string, number>();
    for (const r of rows) {
      const k = `${r.title}\n${r.subtitle}`;
      pairCounts.set(k, (pairCounts.get(k) ?? 0) + 1);
    }
    return rows.map((r) => {
      const k = `${r.title}\n${r.subtitle}`;
      const ambiguous = (pairCounts.get(k) ?? 0) > 1;
      const idTail = r.id.length > 14 ? r.id.slice(-10) : r.id;
      return {
        id: r.id,
        label: ambiguous ? `${r.title} · ${r.subtitle} (${idTail})` : `${r.title} · ${r.subtitle}`,
      };
    });
  }, [nodes, edges]);

  useEffect(() => {
    if (!addOpen) return;
    const attach = pickDefaultAttachParent(nodes, edges);
    setAttachAfterId(attach ?? "");
    const first = typesAvailable[0];
    if (first) setPickType(first);
  }, [addOpen, nodes, edges, typesAvailable]);

  const runFitView = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fitView({ padding: 0.28, maxZoom: 1.1, duration: 200 });
      });
    });
  }, [fitView]);

  const submitAdd = () => {
    const attach =
      attachAfterId.trim() || pickDefaultAttachParent(nodes, edges) || null;
    onAddNode(pickType, attach);
    setAddOpen(false);
    runFitView();
  };

  return (
    <>
      <Panel position="top-right" className="!m-2 flex flex-row items-center gap-2">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-950 shadow-sm hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-100 dark:hover:bg-violet-900/60"
          title="Add a node to the workflow"
        >
          <Plus className="size-4 shrink-0" strokeWidth={2} aria-hidden />
          Add node
        </button>
        <button
          type="button"
          onClick={() => {
            onReorganize();
            runFitView();
          }}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          title="Reorder nodes left to right along the workflow"
        >
          Reorder
        </button>
      </Panel>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add workflow node"
        className="max-w-md"
        bodyClassName="sm:px-6 sm:py-5"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="wf-add-type" className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Node type
            </label>
            <select
              id="wf-add-type"
              className={selectLike}
              value={pickType}
              onChange={(e) => setPickType(e.target.value as AgentNodeType)}
            >
              {typesAvailable.map((t) => (
                <option key={t} value={t}>
                  {formatNodeTypeOption(t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="wf-add-after" className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Connect after
            </label>
            <p className="mb-1.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-500">
              New node will be linked from this step (flow continues left → right).
            </p>
            <select
              id="wf-add-after"
              className={selectLike}
              value={attachAfterId}
              onChange={(e) => setAttachAfterId(e.target.value)}
            >
              {attachChoices.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitAdd}
              className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
            >
              Add node
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

const defaultNodes: Node[] = [
  {
    id: "n-trigger-1",
    type: "trigger",
    position: { x: WORKFLOW_LAYOUT_BASE_X, y: WORKFLOW_LAYOUT_BASE_Y },
    data: { label: "Start" },
  },
];

/** At most one link between any two nodes (either direction); no self-loops. */
function nodesAlreadyLinked(eds: Edge[], source: string, target: string): boolean {
  if (source === target) return true;
  return eds.some(
    (e) =>
      (e.source === source && e.target === target) ||
      (e.source === target && e.target === source),
  );
}

function dedupeEdgesByNodePair(edges: Edge[]): Edge[] {
  const seen = new Set<string>();
  const out: Edge[] = [];
  for (const e of edges) {
    if (e.source === e.target) continue;
    const key =
      e.source < e.target ? `${e.source}\n${e.target}` : `${e.target}\n${e.source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

function WorkflowFitView({
  drawerOpen,
  layoutSignature,
}: {
  drawerOpen: boolean;
  /** When server graph / hydrates change, frame the pane again (not on every local edit). */
  layoutSignature: string;
}) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    if (!drawerOpen) return;
    const t = window.setTimeout(() => {
      fitView({ padding: 0.28, maxZoom: 1.1, duration: 200 });
    }, 80);
    return () => window.clearTimeout(t);
  }, [drawerOpen, layoutSignature, fitView]);
  return null;
}

export const AgentFlowEditor = forwardRef<AgentFlowEditorHandle, Props>(
  function AgentFlowEditor(
    { className, initialNodes, initialEdges, workflowDrawerOpen = true, onGraphChange },
    ref,
  ) {
    const edgesForLayout = useMemo(
      () => dedupeEdgesByNodePair(initialEdges ?? []),
      [initialEdges],
    );

    const laidOutNodes = useMemo(() => {
      const seed = initialNodes?.length ? initialNodes : defaultNodes;
      return layoutWorkflowLeftToRight(seed, edgesForLayout);
    }, [initialNodes, edgesForLayout]);

    const propsFingerprint = useMemo(
      () => graphPropsFingerprint(initialNodes, edgesForLayout),
      [initialNodes, edgesForLayout],
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(laidOutNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(edgesForLayout);

    const appliedFingerprintRef = useRef<string | null>(null);
    const suppressGraphNotifyRef = useRef(0);

    useEffect(() => {
      if (appliedFingerprintRef.current === propsFingerprint) return;
      appliedFingerprintRef.current = propsFingerprint;
      suppressGraphNotifyRef.current += 1;
      const seed = initialNodes?.length ? initialNodes : defaultNodes;
      setNodes(layoutWorkflowLeftToRight(seed, edgesForLayout));
      setEdges(edgesForLayout);
    }, [propsFingerprint, initialNodes, edgesForLayout, setNodes, setEdges]);

    useImperativeHandle(
      ref,
      () => ({
        getSnapshot: () => ({ nodes, edges }),
      }),
      [nodes, edges],
    );

    const isFirstGraphNotifyRef = useRef(true);
    useEffect(() => {
      if (!onGraphChange) return;
      if (isFirstGraphNotifyRef.current) {
        isFirstGraphNotifyRef.current = false;
        return;
      }
      if (suppressGraphNotifyRef.current > 0) {
        suppressGraphNotifyRef.current -= 1;
        return;
      }
      const t = window.setTimeout(() => {
        onGraphChange({ nodes, edges });
      }, 420);
      return () => window.clearTimeout(t);
    }, [nodes, edges, onGraphChange]);

    const handleReorganize = useCallback(() => {
      setNodes((current) =>
        layoutWorkflowLeftToRight(current, dedupeEdgesByNodePair(edges)),
      );
    }, [edges, setNodes]);

    const handleAddNode = useCallback(
      (type: AgentNodeType, attachAfterId: string | null) => {
        const newId = `n-${type}-${crypto.randomUUID().slice(0, 10)}`;
        const data = defaultPayloadForNodeType(type);
        const newNode: Node = {
          id: newId,
          type,
          position: { x: 0, y: 0 },
          data,
        };
        let nextEdges = [...edges];
        if (attachAfterId && nodes.some((n) => n.id === attachAfterId)) {
          if (!nodesAlreadyLinked(nextEdges, attachAfterId, newId)) {
            nextEdges.push({
              id: `e-${attachAfterId}-${newId}-${crypto.randomUUID().slice(0, 8)}`,
              source: attachAfterId,
              target: newId,
            });
          }
        }
        const deduped = dedupeEdgesByNodePair(nextEdges);
        const laidOut = layoutWorkflowLeftToRight([...nodes, newNode], deduped);
        suppressGraphNotifyRef.current += 1;
        setNodes(laidOut);
        setEdges(deduped);
      },
      [nodes, edges, setNodes, setEdges],
    );

    const isValidConnection = useCallback(
      (connection: Connection) => {
        const { source, target } = connection;
        if (!source || !target) return false;
        return !nodesAlreadyLinked(edges, source, target);
      },
      [edges],
    );

    const onConnect = useCallback(
      (params: Connection) => {
        setEdges((eds) => {
          if (!params.source || !params.target) return eds;
          if (nodesAlreadyLinked(eds, params.source, params.target)) return eds;
          return addEdge(params, eds);
        });
      },
      [setEdges],
    );

    return (
      <div
        className={cn(
          "flex h-full w-full min-h-0 flex-1 flex-col",
          className,
        )}
      >
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <ReactFlow
            className="h-full min-h-[min(68dvh,780px)] w-full"
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            nodeTypes={rfNodeTypes}
            fitView
            fitViewOptions={{ padding: 0.28, maxZoom: 1.1 }}
            defaultEdgeOptions={{
              type: "smoothstep",
              style: { strokeWidth: 2 },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 18,
                height: 18,
                color: "#71717a",
              },
            }}
            proOptions={{ hideAttribution: true }}
          >
            <WorkflowFitView
              drawerOpen={workflowDrawerOpen}
              layoutSignature={propsFingerprint}
            />
            <WorkflowToolbar
              nodes={nodes}
              edges={edges}
              onAddNode={handleAddNode}
              onReorganize={handleReorganize}
            />
            <MiniMap zoomable pannable />
            <Controls />
            <Background gap={16} />
          </ReactFlow>
        </div>
      </div>
    );
  },
);
AgentFlowEditor.displayName = "AgentFlowEditor";

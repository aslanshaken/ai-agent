"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
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
import { nodeTypes as allowedNodeTypes } from "@/lib/schemas/agents";
import {
  WORKFLOW_LAYOUT_BASE_X,
  WORKFLOW_LAYOUT_BASE_Y,
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
  /** Called after local edits (debounced). Used for auto-save. */
  onGraphChange?: (snapshot: FlowSnapshot) => void;
};

function ReorderToolbar({
  onReorganize,
}: {
  onReorganize: () => void;
}) {
  const { fitView } = useReactFlow();
  return (
    <Panel position="top-right" className="!m-2">
      <button
        type="button"
        onClick={() => {
          onReorganize();
          window.setTimeout(() => {
            fitView({ padding: 0.28, maxZoom: 1.1 });
          }, 0);
        }}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        title="Reorder nodes left to right along the workflow"
      >
        Reorder
      </button>
    </Panel>
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

export const AgentFlowEditor = forwardRef<AgentFlowEditorHandle, Props>(
  function AgentFlowEditor({ className, initialNodes, initialEdges, onGraphChange }, ref) {
    const laidOutNodes = useMemo(() => {
      const seed = initialNodes?.length ? initialNodes : defaultNodes;
      return layoutWorkflowLeftToRight(seed, initialEdges ?? []);
    }, [initialNodes, initialEdges]);

    const dedupedInitialEdges = useMemo(
      () => dedupeEdgesByNodePair(initialEdges ?? []),
      [initialEdges],
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(laidOutNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(dedupedInitialEdges);

    useImperativeHandle(
      ref,
      () => ({
        getSnapshot: () => ({ nodes, edges }),
      }),
      [nodes, edges],
    );

    const skipGraphNotifyRef = useRef(true);
    useEffect(() => {
      if (!onGraphChange) return;
      if (skipGraphNotifyRef.current) {
        skipGraphNotifyRef.current = false;
        return;
      }
      const t = window.setTimeout(() => {
        onGraphChange({ nodes, edges });
      }, 420);
      return () => window.clearTimeout(t);
    }, [nodes, edges, onGraphChange]);

    const handleReorganize = useCallback(() => {
      setNodes((current) => layoutWorkflowLeftToRight([...current], edges));
    }, [edges, setNodes]);

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
            <ReorderToolbar onReorganize={handleReorganize} />
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

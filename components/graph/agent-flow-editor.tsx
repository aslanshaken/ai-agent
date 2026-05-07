"use client";

import { forwardRef, useCallback, useImperativeHandle, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  addEdge,
  useEdgesState,
  useNodesState,
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
};

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
  function AgentFlowEditor({ className, initialNodes, initialEdges }, ref) {
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
      <div className={cn("flex h-[640px] flex-col", className)}>
        <div className="min-h-0 flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <ReactFlow
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

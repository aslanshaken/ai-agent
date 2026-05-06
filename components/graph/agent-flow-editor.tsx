"use client";

import { forwardRef, useCallback, useImperativeHandle } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { WorkflowNode } from "./workflow-node";
import { nodeTypes as allowedNodeTypes, type AgentNodeType } from "@/lib/schemas/agents";
import { Button } from "@/components/ui/button";
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
    position: { x: 220, y: 40 },
    data: { label: "Start" },
  },
];

export const AgentFlowEditor = forwardRef<AgentFlowEditorHandle, Props>(
  function AgentFlowEditor({ className, initialNodes, initialEdges }, ref) {
    const [nodes, setNodes, onNodesChange] = useNodesState(
      initialNodes?.length ? initialNodes : defaultNodes,
    );
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges ?? []);

    useImperativeHandle(
      ref,
      () => ({
        getSnapshot: () => ({ nodes, edges }),
      }),
      [nodes, edges],
    );

    const onConnect = useCallback(
      (params: Connection) => setEdges((eds) => addEdge(params, eds)),
      [setEdges],
    );

    const addNode = useCallback(
      (type: AgentNodeType) => {
        const id = `n-${type}-${crypto.randomUUID().slice(0, 8)}`;
        const baseData =
          type === "search"
            ? { label: "Search", provider: "mock", query: "", limit: 5 }
            : type === "ai_reasoning"
              ? {
                  label: "AI reasoning",
                  instruction: "",
                  outputFormat: "summary" as const,
                  model: "",
                }
              : type === "save_to_db"
                ? {
                    label: "Save to DB",
                    target: "research_results" as const,
                    title: "",
                    sourceNodeId: "",
                    tags: "",
                  }
                : { label: type.replace(/_/g, " ") };
        setNodes((nds) => [
          ...nds,
          {
            id,
            type,
            position: { x: 120 + nds.length * 24, y: 140 + nds.length * 18 },
            data: baseData,
          },
        ]);
      },
      [setNodes],
    );

    return (
      <div className={cn("flex h-[560px] flex-col gap-2", className)}>
        <p className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">Test workflow:</span>{" "}
          trigger → search → ai_reasoning → approval → save_to_db. Approve to resume; configure
          save_to_db title/tags/source node id. Saved rows appear under Memory → Research results.
        </p>
        <div className="flex flex-wrap gap-2">
          {allowedNodeTypes.map((t) => (
            <Button
              key={t}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => addNode(t)}
            >
              + {t.replace(/_/g, " ")}
            </Button>
          ))}
        </div>
        <div className="min-h-0 flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={rfNodeTypes}
            fitView
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

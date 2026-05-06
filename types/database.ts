export type AgentRunStatus = "pending" | "running" | "completed" | "failed";

export type DbAgent = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  mission: string | null;
  created_at: string;
  updated_at: string;
};

export type DbAgentVersion = {
  id: string;
  agent_id: string;
  version: number;
  config: Record<string, unknown> | null;
  created_at: string;
};

export type DbAgentNode = {
  id: string;
  version_id: string;
  react_flow_id: string;
  type: string;
  label: string | null;
  position_x: number;
  position_y: number;
  data: Record<string, unknown> | null;
  created_at: string;
};

export type DbAgentEdge = {
  id: string;
  version_id: string;
  react_flow_id: string;
  source_node: string;
  target_node: string;
  source_handle: string | null;
  target_handle: string | null;
  created_at: string;
};

export type DbAgentRun = {
  id: string;
  agent_id: string;
  version_id: string | null;
  status: AgentRunStatus;
  started_at: string | null;
  completed_at: string | null;
  output: Record<string, unknown> | null;
  error: string | null;
  trigger_run_id: string | null;
  created_at: string;
};

export type DbAgentRunStep = {
  id: string;
  run_id: string;
  step_index: number;
  node_type: string | null;
  node_id: string | null;
  status: string;
  output: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
};

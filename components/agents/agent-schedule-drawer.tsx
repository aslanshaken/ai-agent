"use client";

import { Drawer } from "@/components/ui/drawer";
import { AgentSchedulePanel } from "@/components/agents/agent-schedule-panel";

export function AgentScheduleDrawer({
  open,
  onClose,
  agentId,
}: {
  open: boolean;
  onClose: () => void;
  agentId: string;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Schedule"
      widthClassName="max-w-2xl"
    >
      <AgentSchedulePanel agentId={agentId} embedded />
    </Drawer>
  );
}

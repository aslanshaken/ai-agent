"use client";

import { Drawer } from "@/components/ui/drawer";

export function AgentWorkflowDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Workflow"
      widthClassName="max-w-[min(96vw,90rem)]"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        {children}
      </div>
    </Drawer>
  );
}

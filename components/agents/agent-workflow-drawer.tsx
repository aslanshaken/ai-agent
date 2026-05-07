"use client";

import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

export function AgentWorkflowDrawer({
  open,
  onClose,
  onSaveWorkflow,
  saving,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onSaveWorkflow: () => void;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Workflow"
      widthClassName="max-w-[min(96vw,72rem)]"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" onClick={onSaveWorkflow} disabled={saving}>
            {saving ? "Saving…" : "Save workflow"}
          </Button>
        </div>
      }
    >
      <div className="h-[min(78vh,700px)] min-h-[400px] w-full overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        {children}
      </div>
    </Drawer>
  );
}

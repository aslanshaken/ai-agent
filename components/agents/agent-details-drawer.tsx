"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer } from "@/components/ui/drawer";
import { cn } from "@/lib/utils/cn";

export function AgentDetailsDrawer({
  open,
  onClose,
  name,
  description,
  mission,
  onChangeName,
  onChangeDescription,
  onChangeMission,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  description: string;
  mission: string;
  onChangeName: (v: string) => void;
  onChangeDescription: (v: string) => void;
  onChangeMission: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Details"
      widthClassName="max-w-lg"
      footer={
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save details"}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-500" htmlFor="drawer-agent-name">
            Agent name
          </label>
          <Input
            id="drawer-agent-name"
            value={name}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="Investor brief agent"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-500" htmlFor="drawer-agent-description">
            Description
          </label>
          <textarea
            id="drawer-agent-description"
            className={cn(
              "min-h-[72px] w-full resize-y rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm shadow-sm",
              "placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
              "dark:border-zinc-700 dark:focus-visible:ring-zinc-600",
            )}
            placeholder="Optional — what this agent is for"
            value={description}
            onChange={(e) => onChangeDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-500" htmlFor="drawer-agent-mission">
            Mission
          </label>
          <textarea
            id="drawer-agent-mission"
            className={cn(
              "min-h-[100px] w-full resize-y rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm shadow-sm",
              "placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
              "dark:border-zinc-700 dark:focus-visible:ring-zinc-600",
            )}
            placeholder="What outcome should runs optimize for?"
            value={mission}
            onChange={(e) => onChangeMission(e.target.value)}
            rows={4}
          />
        </div>
      </div>
    </Drawer>
  );
}

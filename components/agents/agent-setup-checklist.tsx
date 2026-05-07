import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

function Item({
  done,
  label,
  hint,
}: {
  done: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <li className="flex gap-3 text-sm">
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
          done
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-zinc-300 bg-zinc-50 text-transparent dark:border-zinc-600 dark:bg-zinc-900",
        )}
        aria-hidden
      >
        {done ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <div>
        <p className={cn("font-medium", done ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-900 dark:text-zinc-100")}>
          {label}
        </p>
        {hint ? <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
      </div>
    </li>
  );
}

export function AgentSetupChecklist(props: {
  graphSaved: boolean;
  scheduleEnabled: boolean;
  hasRun: boolean;
  pendingApprovals: number;
  resolvedApprovals: number;
  hasSavedOutputs: boolean;
}) {
  const approvalActivity = props.pendingApprovals > 0 || props.resolvedApprovals > 0;

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Setup progress
      </p>
      <ul className="mt-3 space-y-3">
        <Item
          done={props.graphSaved}
          label="Workflow saved"
          hint="Graph nodes are stored on the latest version."
        />
        <Item
          done={props.scheduleEnabled}
          label="Schedule configured"
          hint="Enable a cron preset so this agent can run automatically."
        />
        <Item
          done={props.hasRun}
          label="Run tested"
          hint="Use Run now at least once to validate the path."
        />
        <Item
          done={approvalActivity}
          label="Approvals touched"
          hint={
            props.pendingApprovals > 0
              ? `${props.pendingApprovals} pending — approve or reject to continue.`
              : props.resolvedApprovals > 0
                ? `${props.resolvedApprovals} resolved.`
                : "Runs with approval nodes will appear here."
          }
        />
        <Item
          done={props.hasSavedOutputs}
          label="Outputs saved"
          hint="Briefings or research rows linked to this agent’s runs."
        />
      </ul>
    </div>
  );
}

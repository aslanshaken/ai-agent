"use client";

import { Input } from "@/components/ui/input";
import { nodeTypes } from "@/lib/schemas/agents";
import { cn } from "@/lib/utils/cn";

const NODE_SLUG_EXAMPLES = nodeTypes.slice(0, 5).join(", ");

export function AgentMemoryPermissionsFields({
  idPrefix,
  memoryCategoriesText,
  allowedNodeTypesText,
  riskLevel,
  onChangeMemoryCategoriesText,
  onChangeAllowedNodeTypesText,
  onChangeRiskLevel,
  showIntro = true,
  className,
}: {
  idPrefix: string;
  memoryCategoriesText: string;
  allowedNodeTypesText: string;
  riskLevel: string;
  onChangeMemoryCategoriesText: (v: string) => void;
  onChangeAllowedNodeTypesText: (v: string) => void;
  onChangeRiskLevel: (v: string) => void;
  showIntro?: boolean;
  className?: string;
}) {
  const datalistId = `${idPrefix}-node-type-suggestions`;

  return (
    <div className={cn("flex flex-col gap-5 text-sm", className)}>
      {showIntro ? (
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Choose which memory this agent may search, optionally limit which workflow node types it can
          use, and set a risk level for safety checks.
        </p>
      ) : null}

      <section
        className={cn(
          "rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40",
        )}
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Memory categories
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Used for semantic retrieval. List slugs that scope what this agent can recall—one per line
          or comma-separated.
        </p>
        <div className="mt-3 space-y-1.5">
          <label
            className="text-xs font-medium text-zinc-600 dark:text-zinc-300"
            htmlFor={`${idPrefix}-memory-cats`}
          >
            Categories
          </label>
          <textarea
            id={`${idPrefix}-memory-cats`}
            className={cn(
              "min-h-[88px] w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm",
              "placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
              "dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:ring-zinc-600",
            )}
            placeholder={"company_context\nresearch_history"}
            value={memoryCategoriesText}
            onChange={(e) => onChangeMemoryCategoriesText(e.target.value)}
            rows={3}
          />
        </div>
      </section>

      <section
        className={cn(
          "rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40",
        )}
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Allowed node types
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Leave empty to allow every node type in the graph. To restrict, enter comma-separated
          slugs (e.g. {NODE_SLUG_EXAMPLES}).
        </p>
        <div className="mt-3 space-y-1.5">
          <label
            className="text-xs font-medium text-zinc-600 dark:text-zinc-300"
            htmlFor={`${idPrefix}-allowed-nodes`}
          >
            Slugs
          </label>
          <Input
            id={`${idPrefix}-allowed-nodes`}
            list={datalistId}
            value={allowedNodeTypesText}
            onChange={(e) => onChangeAllowedNodeTypesText(e.target.value)}
            placeholder="Leave blank for all types"
            autoComplete="off"
          />
          <datalist id={datalistId}>
            {nodeTypes.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
      </section>

      <section
        className={cn(
          "rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40",
        )}
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Risk level
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Signals how sensitive this agent’s actions are. Higher levels can trigger stricter review
          or approval rules in your workspace.
        </p>
        <div className="mt-3 space-y-1.5">
          <label
            className="text-xs font-medium text-zinc-600 dark:text-zinc-300"
            htmlFor={`${idPrefix}-risk`}
          >
            Level
          </label>
          <select
            id={`${idPrefix}-risk`}
            className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-950"
            value={riskLevel}
            onChange={(e) => onChangeRiskLevel(e.target.value)}
          >
            <option value="">Not set</option>
            <option value="low">Low — routine reads and safe actions</option>
            <option value="medium">Medium — standard automation</option>
            <option value="high">High — sensitive data or powerful tools</option>
          </select>
        </div>
      </section>
    </div>
  );
}

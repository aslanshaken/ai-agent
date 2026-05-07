import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  CheckCircle2,
  Link2,
  Mail,
  MinusCircle,
  SearchCode,
  Send,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { RegisterConnectionButton } from "@/components/integrations/register-connection-button";
import { cn } from "@/lib/utils/cn";
import type { IntegrationProviderId } from "@/lib/integrations/provider-ids";

const CATALOG: {
  id: IntegrationProviderId;
  name: string;
  blurb: string;
  Icon: LucideIcon;
  iconShell: string;
}[] = [
  {
    id: "gmail",
    name: "Gmail",
    blurb: "Inbox, send, and triage via the Google APIs when OAuth is enabled.",
    Icon: Mail,
    iconShell:
      "bg-red-500/10 text-red-600 dark:bg-red-950/50 dark:text-red-300",
  },
  {
    id: "telegram",
    name: "Telegram",
    blurb: "Bot token for notifications and channels when messaging workflows ship.",
    Icon: Send,
    iconShell:
      "bg-sky-500/10 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300",
  },
  {
    id: "exa",
    name: "Exa",
    blurb: "Neural and keyword web search for graph search nodes.",
    Icon: SearchCode,
    iconShell:
      "bg-violet-500/10 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300",
  },
  {
    id: "tavily",
    name: "Tavily",
    blurb: "Search API tuned for agents and research-style retrieval.",
    Icon: Sparkles,
    iconShell:
      "bg-amber-500/10 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
];

function providerIcon(id: string): LucideIcon {
  const normalized = id.toLowerCase() as IntegrationProviderId;
  const entry = CATALOG.find((c) => c.id === normalized);
  return entry?.Icon ?? Link2;
}

function providerShell(id: string): string {
  const normalized = id.toLowerCase() as IntegrationProviderId;
  const entry = CATALOG.find((c) => c.id === normalized);
  return entry?.iconShell ?? "bg-zinc-500/10 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
}

function hasSavedConnection(
  connections: { provider: string }[],
  id: IntegrationProviderId,
): boolean {
  return connections.some((c) => c.provider.toLowerCase() === id);
}

export function IntegrationDirectory({
  connections,
  adapters,
}: {
  connections: { id: string; provider: string; created_at: string }[];
  adapters: Record<IntegrationProviderId, boolean>;
}) {
  const availableToAdd = CATALOG.filter(
    (c) => adapters[c.id] && !hasSavedConnection(connections, c.id),
  ).length;

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Available integrations</CardTitle>
              <CardDescription className="mt-1 max-w-xl">
                Adapter keys come from your deployment environment. OAuth flows can plug into the
                same registry later — connections you add here are recorded for your workspace.
              </CardDescription>
            </div>
            {availableToAdd > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                {availableToAdd} ready to add
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {CATALOG.map((item) => {
            const envReady = adapters[item.id];
            const saved = hasSavedConnection(connections, item.id);
            const showAdd = envReady && !saved;

            return (
              <div
                key={item.id}
                className="flex gap-3 rounded-xl border border-zinc-200 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/30"
              >
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    item.iconShell,
                  )}
                >
                  <item.Icon className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {item.name}
                    </h3>
                    {saved ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" aria-hidden />
                        Added
                      </span>
                    ) : envReady ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-400">
                        <CheckCircle2 className="size-3" aria-hidden />
                        Keys OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/10 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                        <MinusCircle className="size-3" aria-hidden />
                        Not configured
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {item.blurb}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {showAdd ? (
                      <RegisterConnectionButton providerId={item.id} />
                    ) : saved ? (
                      <span className="text-xs text-zinc-500">Listed under saved connections.</span>
                    ) : (
                      <Link href="/settings" className={buttonClassName("outline", "sm")}>
                        Environment setup
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Saved connections</CardTitle>
          <CardDescription>
            Registry rows in your workspace (same providers as above).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
              <Link2 className="mx-auto mb-2 size-8 text-zinc-400" aria-hidden />
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                No connections saved yet
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                When an integration shows <span className="font-medium">Keys OK</span>, use{" "}
                <span className="font-medium">Add</span> to register it here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {connections.map((c) => {
                const Icon = providerIcon(c.provider);
                return (
                  <li key={c.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        providerShell(c.provider),
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium capitalize text-zinc-900 dark:text-zinc-50">
                        {c.provider}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Calendar className="size-3.5 shrink-0" aria-hidden />
                        {new Date(c.created_at).toLocaleString()}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

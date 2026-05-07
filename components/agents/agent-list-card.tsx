"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export function AgentListCard({
  id,
  name,
  description,
  updatedAt,
}: {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete agent "${name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? "Could not delete agent.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <Link href={`/agents/${id}`} className="block">
        <Card className="transition-colors hover:border-zinc-400 dark:hover:border-zinc-600">
          <CardHeader className="space-y-1 p-4 pb-2">
            <CardTitle className="pr-10 text-sm font-semibold leading-snug">{name}</CardTitle>
            <CardDescription className="line-clamp-2 text-xs leading-snug">
              {description || "No description"}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0 text-[11px] leading-tight text-zinc-500">
            Updated {new Date(updatedAt).toLocaleString()}
          </CardContent>
        </Card>
      </Link>
      <button
        type="button"
        aria-label={`Delete ${name}`}
        disabled={busy}
        onClick={onDelete}
        className={cn(
          "absolute right-2 top-2 z-10 rounded-lg border border-zinc-200 bg-white/95 p-1.5 text-zinc-500 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-zinc-700 dark:bg-zinc-900/95 dark:hover:border-red-900 dark:hover:bg-red-950/50 dark:hover:text-red-300",
          busy && "pointer-events-none opacity-50",
        )}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}

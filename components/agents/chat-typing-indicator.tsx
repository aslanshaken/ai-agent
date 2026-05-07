"use client";

import { Bot } from "lucide-react";

function BouncingDots() {
  return (
    <span className="flex translate-y-0.5 gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block size-2 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500"
          style={{
            animationDelay: `${i * 140}ms`,
            animationDuration: "0.8s",
          }}
        />
      ))}
    </span>
  );
}

export function ChatTypingIndicator({
  label = "Assistant is typing",
  compact,
}: {
  label?: string;
  /** Single-line strip for the sticky footer — stays visible with the composer. */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-zinc-200/90 bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-300"
        role="status"
        aria-live="polite"
      >
        <div
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
          aria-hidden
        >
          <Bot className="size-3" strokeWidth={2} />
        </div>
        <span className="sr-only">{label}</span>
        <BouncingDots />
        <span className="min-w-0">Replying…</span>
      </div>
    );
  }

  return (
    <div className="flex gap-3 py-1">
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm"
        aria-hidden
      >
        <Bot className="size-4" strokeWidth={2} />
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/90 bg-white px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/90">
        <span className="sr-only">{label}</span>
        <BouncingDots />
      </div>
    </div>
  );
}

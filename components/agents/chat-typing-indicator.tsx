"use client";

import { Bot } from "lucide-react";

export function ChatTypingIndicator({ label = "Assistant is typing" }: { label?: string }) {
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
        <span className="flex translate-y-0.5 gap-1">
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
      </div>
    </div>
  );
}

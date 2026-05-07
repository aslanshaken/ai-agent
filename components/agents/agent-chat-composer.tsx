"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function AgentChatComposer({
  onSend,
  /** Blocks send and Enter-to-send only — textarea stays editable so you can draft the next message while waiting. */
  submitDisabled,
  /** Fully disables the field (rare; e.g. hard lock). */
  inputLocked,
}: {
  onSend: (text: string) => void;
  submitDisabled?: boolean;
  inputLocked?: boolean;
}) {
  const [text, setText] = useState("");

  function submit() {
    const t = text.trim();
    if (!t || submitDisabled || inputLocked) return;
    onSend(t);
    setText("");
  }

  const blocked = !!inputLocked;

  return (
    <div className="relative flex items-end gap-2 rounded-[1.25rem] border border-zinc-200 bg-zinc-50/80 px-3 py-2 shadow-inner dark:border-zinc-700 dark:bg-zinc-900/60">
      <textarea
        className={cn(
          "max-h-40 min-h-[48px] flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-relaxed text-zinc-900 placeholder:text-zinc-400",
          "focus-visible:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500",
          // Avoid the browser scrolling ancestors (main/window) to keep the textarea in view when it grows.
          "[scroll-margin-block-end:0] [scroll-margin-block-start:0]",
        )}
        placeholder="Message your agent…"
        rows={1}
        value={text}
        disabled={blocked}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
      />
      <button
        type="button"
        disabled={blocked || submitDisabled || !text.trim()}
        onClick={() => void submit()}
        className={cn(
          "mb-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white shadow-md transition-transform",
          "hover:scale-105 hover:bg-zinc-800 active:scale-95",
          "disabled:pointer-events-none disabled:opacity-30 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white",
        )}
        aria-label="Send message"
      >
        <Send className="size-4" aria-hidden />
      </button>
    </div>
  );
}

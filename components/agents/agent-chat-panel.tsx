"use client";

import { useEffect, useRef } from "react";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AgentChatComposer } from "@/components/agents/agent-chat-composer";
import {
  AgentRunTimeline,
  type TimelineStep,
} from "@/components/agents/agent-run-timeline";
import { InlineApprovalCard } from "@/components/agents/inline-approval-card";
import { ChatTypingIndicator } from "@/components/agents/chat-typing-indicator";

export type ChatMessage = {
  id: string;
  role: "system" | "user" | "assistant" | "run";
  content: string;
};

const QUICK_ACTIONS = [
  { label: "Run", text: "run" },
  { label: "Save", text: "save" },
  { label: "Explain workflow", text: "explain workflow" },
  { label: "Latest run", text: "latest run" },
  { label: "Pending approval", text: "pending approval" },
  { label: "Improve", text: "improve workflow" },
] as const;

function MessageBubble({
  m,
}: {
  m: ChatMessage;
}) {
  if (m.role === "system") {
    return (
      <div className="mx-auto max-w-lg px-2 py-3 text-center">
        <p className="text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">{m.content}</p>
      </div>
    );
  }

  if (m.role === "user") {
    return (
      <div className="flex justify-end gap-2">
        <div
          className={cn(
            "max-w-[min(100%,28rem)] rounded-[1.35rem] px-4 py-2.5 text-[15px] leading-relaxed shadow-sm",
            "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900",
          )}
        >
          <p className="whitespace-pre-wrap">{m.content}</p>
        </div>
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
          <User className="size-4 text-zinc-600 dark:text-zinc-300" aria-hidden />
        </div>
      </div>
    );
  }

  const isRunEvent = m.role === "run";
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm">
        <Bot className="size-4" strokeWidth={2} aria-hidden />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div
          className={cn(
            "max-w-[min(100%,32rem)] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm",
            isRunEvent
              ? "border border-violet-200/90 bg-violet-50/90 text-violet-950 dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-100"
              : "border border-zinc-100 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-100",
          )}
        >
          <p className="whitespace-pre-wrap">{m.content}</p>
        </div>
      </div>
    </div>
  );
}

export function AgentChatPanel({
  messages,
  onSendMessage,
  onQuickAction,
  timelineSteps,
  runStatus,
  approvalId,
  onApprovalResolved,
  composerDisabled,
  isProcessing,
}: {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void | Promise<void>;
  onQuickAction: (text: string) => void | Promise<void>;
  timelineSteps: TimelineStep[];
  runStatus: string | null;
  approvalId: string | null;
  onApprovalResolved: () => void;
  composerDisabled?: boolean;
  /** Shows typing indicator while assistant logic runs */
  isProcessing?: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, timelineSteps, runStatus, approvalId, isProcessing]);

  return (
    <div
      className={cn(
        "flex min-h-[min(560px,calc(100vh-14rem))] flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-50/50 shadow-lg shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-950/80 dark:shadow-black/40",
      )}
    >
      <div className="border-b border-zinc-200/80 bg-white/90 px-4 py-3 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Workspace chat
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              History, commands, live run steps & approvals
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4 sm:px-5">
        <div className="space-y-5">
          {messages.map((m) => (
            <MessageBubble key={m.id} m={m} />
          ))}
        </div>

        {isProcessing ? <ChatTypingIndicator /> : null}

        {timelineSteps.length > 0 || runStatus ? (
          <AgentRunTimeline steps={timelineSteps} runStatus={runStatus} />
        ) : null}

        {approvalId ? (
          <InlineApprovalCard
            approvalId={approvalId}
            onResolved={onApprovalResolved}
          />
        ) : null}

        <div ref={endRef} className="h-px shrink-0" aria-hidden />
      </div>

      <div className="border-t border-zinc-200/80 bg-white/95 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={composerDisabled || isProcessing}
              onClick={() => void onQuickAction(a.text)}
              className={cn(
                "shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition-colors",
                "hover:border-zinc-300 hover:bg-zinc-50",
                "disabled:pointer-events-none disabled:opacity-40",
                "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <AgentChatComposer
        onSend={onSendMessage}
        disabled={composerDisabled || isProcessing}
      />
    </div>
  );
}

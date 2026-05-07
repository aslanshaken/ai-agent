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
  timelineSteps,
  runStatus,
  approvalId,
  onApprovalResolved,
  composerDisabled,
  isProcessing,
}: {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void | Promise<void>;
  timelineSteps: TimelineStep[];
  runStatus: string | null;
  approvalId: string | null;
  onApprovalResolved: () => void;
  composerDisabled?: boolean;
  /** Shows typing indicator while assistant logic runs */
  isProcessing?: boolean;
}) {
  /** Scroll only this pane — never use scrollIntoView (it scrolls main / window). */
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    const run = () => {
      el.scrollTop = el.scrollHeight;
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, [messages, timelineSteps, runStatus, approvalId, isProcessing]);

  return (
    <div
      className={cn(
        // Fills parent: only the transcript scrolls; composer stays at the bottom (no nested card chrome).
        "flex h-full min-h-0 flex-col overflow-hidden",
      )}
    >
      <div
        ref={transcriptRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-4 [overflow-anchor:none]"
      >
        <div className="space-y-5">
          {messages.map((m) => (
            <MessageBubble key={m.id} m={m} />
          ))}
        </div>

        {timelineSteps.length > 0 || runStatus ? (
          <AgentRunTimeline steps={timelineSteps} runStatus={runStatus} />
        ) : null}

        {approvalId ? (
          <InlineApprovalCard
            approvalId={approvalId}
            onResolved={onApprovalResolved}
          />
        ) : null}
      </div>

      <div className="sticky bottom-0 z-20 mt-3 mb-3 flex shrink-0 flex-col gap-2 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {isProcessing ? <ChatTypingIndicator compact /> : null}
        <AgentChatComposer
          onSend={onSendMessage}
          submitDisabled={composerDisabled || isProcessing}
          inputLocked={composerDisabled}
        />
      </div>
    </div>
  );
}

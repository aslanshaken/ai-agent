"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils/cn";

const workflowModalShell =
  "max-h-[min(92vh,920px)] w-full max-w-[min(96vw,56rem)] sm:max-w-[min(96vw,60rem)]";

export function WorkflowExpandableTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
  modalTitle,
  textareaClassName,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  modalTitle: string;
  textareaClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const clampClass = rows <= 2 ? "line-clamp-3" : "line-clamp-6";

  return (
    <>
      <label className="block text-xs font-medium text-zinc-500">{label}</label>
      <button
        type="button"
        className={cn(
          "nodrag w-full rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-left text-sm leading-snug text-zinc-900 shadow-sm outline-none ring-offset-2 transition-colors hover:border-zinc-400 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-500 dark:hover:bg-zinc-800/80 dark:focus-visible:ring-zinc-600",
          !value && "text-zinc-400",
          textareaClassName,
        )}
        style={{ minHeight: `${Math.max(3, rows * 1.35)}rem` }}
        onClick={() => setOpen(true)}
        title="Click to edit in a larger window"
      >
        <span
          className={cn(
            "block whitespace-pre-wrap break-words",
            value ? clampClass : "",
          )}
        >
          {value || placeholder || "Click to edit…"}
        </span>
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={modalTitle}
        className={workflowModalShell}
        titleClassName="text-lg font-semibold sm:text-xl"
        bodyClassName="px-5 py-5 sm:px-8 sm:py-6"
      >
        <textarea
          className="nodrag min-h-[min(65vh,560px)] w-full resize-y rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base leading-relaxed text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 sm:min-h-[min(68vh,600px)] sm:px-5 sm:py-4 sm:text-lg"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      </Modal>
    </>
  );
}

export function WorkflowModalInput({
  label,
  value,
  onChange,
  placeholder,
  modalTitle,
  inputClassName,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  modalTitle: string;
  inputClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <label className="block text-xs font-medium text-zinc-500">{label}</label>
      <button
        type="button"
        className={cn(
          "nodrag w-full truncate rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-left text-sm text-zinc-900 shadow-sm outline-none ring-offset-2 transition-colors hover:border-zinc-400 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-500 dark:hover:bg-zinc-800/80 dark:focus-visible:ring-zinc-600",
          inputClassName,
        )}
        onClick={() => setOpen(true)}
        title="Click to edit in a larger window"
      >
        {value ? (
          <span className="block truncate">{value}</span>
        ) : (
          <span className="text-zinc-400">{placeholder ?? "Click to edit…"}</span>
        )}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={modalTitle}
        className="max-w-xl max-h-[min(88vh,720px)]"
        titleClassName="text-lg sm:text-xl"
        bodyClassName="px-6 py-5"
      >
        <Input
          className="nodrag h-12 text-base sm:text-lg"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
      </Modal>
    </>
  );
}

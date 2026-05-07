"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  titleClassName,
  bodyClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  bodyClassName?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "relative flex max-h-[min(85vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950",
          className,
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:px-5 sm:py-4">
          <h2
            id="modal-title"
            className={cn(
              "text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50",
              titleClassName,
            )}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div
          className={cn("min-h-0 flex-1 overflow-y-auto px-4 py-3", bodyClassName)}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

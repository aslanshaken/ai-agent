"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Drawer({
  open,
  onClose,
  title,
  children,
  widthClassName = "max-w-lg",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  widthClassName?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex justify-end",
        !open && "hidden",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close panel"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative flex h-full w-full flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950",
          widthClassName,
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

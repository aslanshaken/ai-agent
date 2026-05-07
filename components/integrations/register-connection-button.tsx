"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { IntegrationProviderId } from "@/lib/integrations/provider-ids";

type Props = {
  providerId: IntegrationProviderId;
  disabled?: boolean;
};

export function RegisterConnectionButton({ providerId, disabled }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        alert(body.error ?? "Could not save connection");
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className={cn(buttonClassName("default", "sm"), "gap-1.5")}
      disabled={disabled || pending}
      onClick={handleClick}
    >
      <Plus className="size-4 shrink-0" aria-hidden />
      {pending ? "Adding…" : "Add"}
    </button>
  );
}

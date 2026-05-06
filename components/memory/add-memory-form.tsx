"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddMemoryForm() {
  const router = useRouter();
  const [scope, setScope] = useState("global");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setContent("");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-sm font-semibold">Add memory</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-zinc-500" htmlFor="mem-scope">
            Scope
          </label>
          <Input
            id="mem-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="global, investor, product…"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-zinc-500" htmlFor="mem-content">
          Content
        </label>
        <textarea
          id="mem-content"
          className="min-h-[100px] w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Structured note to retrieve later…"
        />
      </div>
      <Button type="button" onClick={submit} disabled={saving}>
        {saving ? "Saving…" : "Save to company memory"}
      </Button>
    </div>
  );
}

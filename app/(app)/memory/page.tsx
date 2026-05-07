import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddMemoryForm } from "@/components/memory/add-memory-form";
import { buttonClassName } from "@/components/ui/button";
import { listCompanyMemory } from "@/lib/memory/memory-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function memoryPreviewText(m: {
  content?: string | null;
  content_json?: unknown;
}): string {
  const j = m.content_json;
  if (
    j &&
    typeof j === "object" &&
    !Array.isArray(j) &&
    "text" in j &&
    typeof (j as { text?: unknown }).text === "string"
  ) {
    return (j as { text: string }).text;
  }
  return typeof m.content === "string" ? m.content : "";
}

export default async function MemoryPage() {
  let rows: {
    id: string;
    scope: string;
    category?: string | null;
    title?: string | null;
    content: string;
    content_json?: unknown;
    created_at: string;
  }[] = [];
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      rows = await listCompanyMemory(supabase, user.id, { limit: 30 });
    }
  } catch {
    rows = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Memory</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Category-scoped rows with optional embeddings via pgvector for semantic retrieval in agents.
        </p>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Research artifacts</CardTitle>
          <CardDescription>
            Workflow saves from <code className="text-xs">save_to_db</code> (search + reasoning +
            approval pipelines).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/memory/research" className={buttonClassName("outline", "sm")}>
            View research results
          </Link>
        </CardContent>
      </Card>
      <AddMemoryForm />
      <Card>
        <CardHeader>
          <CardTitle>Recent entries</CardTitle>
          <CardDescription>Stored in `company_memory` for your user.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-zinc-500">No entries yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {rows.map((m) => (
                <li
                  key={m.id}
                  className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="text-xs font-medium uppercase text-zinc-500">
                    {m.category ?? m.scope}
                  </div>
                  {m.title ? (
                    <p className="mt-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {m.title}
                    </p>
                  ) : null}
                  <p className="mt-1 whitespace-pre-wrap text-zinc-800 dark:text-zinc-100">
                    {memoryPreviewText(m)}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

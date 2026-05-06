import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ResearchRow = {
  id: string;
  title: string | null;
  summary: string | null;
  tags: string[] | null;
  created_at: string;
  agent_id: string | null;
  run_id: string | null;
  source_node_id: string | null;
  content: unknown;
  result: unknown;
  agents: { name: string } | { name: string }[] | null;
};

export default async function ResearchMemoryPage() {
  let rows: ResearchRow[] = [];
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("research_results")
      .select(
        `
        id,
        title,
        summary,
        tags,
        created_at,
        agent_id,
        run_id,
        source_node_id,
        content,
        result,
        agents ( name )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(100);
    rows = (data as ResearchRow[]) ?? [];
  } catch {
    rows = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Research results</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Artifacts saved from agent workflows (<code className="text-xs">save_to_db</code> →{" "}
            <code className="text-xs">research_results</code>).
          </p>
        </div>
        <Link href="/memory" className={buttonClassName("outline", "sm")}>
          Back to memory
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No research saves yet</CardTitle>
            <CardDescription>
              Run an agent that includes a save_to_db node after search / reasoning (and approval if
              configured). Results appear here automatically.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => {
            const agentRel = r.agents;
            const agentName = Array.isArray(agentRel) ? agentRel[0]?.name : agentRel?.name;
            const tagList = Array.isArray(r.tags) ? r.tags : [];
            return (
              <li key={r.id}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{r.title ?? "Untitled research"}</CardTitle>
                    <CardDescription className="text-xs">
                      {new Date(r.created_at).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {r.summary ? (
                      <p className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">{r.summary}</p>
                    ) : (
                      <p className="text-zinc-500">No summary.</p>
                    )}
                    <dl className="grid gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                      <div>
                        <dt className="font-medium text-zinc-500">Agent</dt>
                        <dd>{agentName ?? r.agent_id ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-zinc-500">Run</dt>
                        <dd className="font-mono">
                          {r.run_id ? (
                            <Link href={`/runs/${r.run_id}`} className="text-sky-700 underline dark:text-sky-300">
                              {r.run_id}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </dd>
                      </div>
                      {r.source_node_id ? (
                        <div>
                          <dt className="font-medium text-zinc-500">Source node</dt>
                          <dd className="font-mono">{r.source_node_id}</dd>
                        </div>
                      ) : null}
                      {tagList.length > 0 ? (
                        <div>
                          <dt className="font-medium text-zinc-500">Tags</dt>
                          <dd className="flex flex-wrap gap-1">
                            {tagList.map((t) => (
                              <span
                                key={t}
                                className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] dark:bg-zinc-800"
                              >
                                {t}
                              </span>
                            ))}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                    <details className="rounded-md border border-zinc-200 dark:border-zinc-800">
                      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Details JSON
                      </summary>
                      <pre className="max-h-64 overflow-auto border-t border-zinc-200 bg-zinc-950 p-3 text-xs text-zinc-100 dark:border-zinc-800">
                        {JSON.stringify({ content: r.content, result: r.result }, null, 2)}
                      </pre>
                    </details>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

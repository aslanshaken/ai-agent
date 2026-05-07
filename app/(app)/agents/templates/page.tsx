import Link from "next/link";
import { AgentTemplatesDirectory } from "@/components/agents/agent-templates-directory";
import { buttonClassName } from "@/components/ui/button";

export default function AgentTemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Blueprints preload a mission and workflow graph. You still save a normal agent to your
            workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/agents/new" className={buttonClassName("default", "sm")}>
            Create agent
          </Link>
          <Link href="/agents" className={buttonClassName("outline", "sm")}>
            Back to agents
          </Link>
        </div>
      </div>
      <AgentTemplatesDirectory />
    </div>
  );
}

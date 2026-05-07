import { NewAgentWizard } from "@/components/agents/new-agent-wizard";

type PageProps = {
  searchParams: Promise<{ template?: string }>;
};

export default async function NewAgentPage(props: PageProps) {
  const q = await props.searchParams;
  const template = typeof q.template === "string" ? q.template : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create agent</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Start from a template blueprint or an empty canvas, then save to your workspace.
        </p>
      </div>
      <NewAgentWizard initialTemplateSlug={template} />
    </div>
  );
}

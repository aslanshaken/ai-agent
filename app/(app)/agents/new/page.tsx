import { NewAgentWizard } from "@/components/agents/new-agent-wizard";

type PageProps = {
  searchParams: Promise<{ template?: string }>;
};

export default async function NewAgentPage(props: PageProps) {
  const q = await props.searchParams;
  const template = typeof q.template === "string" ? q.template : undefined;

  return (
    <div>
      {/* Remount when ?template= changes so we don’t stay on the builder after dropping the query */}
      <NewAgentWizard key={template ?? "none"} initialTemplateSlug={template} />
    </div>
  );
}

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Workspace preferences and environment-backed configuration.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
          <CardDescription>
            See `.env.example` for required keys: Supabase, Trigger.dev, OpenAI, search APIs.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

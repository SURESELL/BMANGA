import { getFeatureFlags } from "@/lib/feature-flags";

export default function SettingsPage() {
  const flags = getFeatureFlags();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Feature flags are controlled via environment variables — see .env.example.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium">Feature flags</h2>
        <ul className="space-y-1.5 text-sm">
          {Object.entries(flags).map(([key, enabled]) => (
            <li key={key} className="flex items-center justify-between">
              <span className="text-muted-foreground">{key}</span>
              <span
                className={
                  enabled
                    ? "rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success"
                    : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                }
              >
                {enabled ? "enabled" : "disabled"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

import { ComingSoon } from "@/components/ComingSoon";

export default function AutomationsPage() {
  return (
    <ComingSoon
      title="Automations"
      description="The scheduler (locking, idempotency, retries with exponential backoff, notifications on failure) lands in Phase 8. It must never depend on a browser tab being open."
    />
  );
}

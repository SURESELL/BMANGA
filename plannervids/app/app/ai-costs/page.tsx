import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { startOfMonth } from "date-fns";

export default async function AiCostsPage() {
  const session = await getSession();
  const env = getEnv();
  const monthCosts = await prisma.aiCost.aggregate({
    where: { workspaceId: session!.workspaceId, occurredAt: { gte: startOfMonth(new Date()) } },
    _sum: { costCents: true },
  });

  const spentCents = monthCosts._sum.costCents ?? 0;
  const budgetCents = env.AI_MONTHLY_BUDGET_CENTS;
  const pct = Math.min(100, Math.round((spentCents / budgetCents) * 100));

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">AI &amp; API Costs</h1>
        <p className="text-sm text-muted-foreground">
          Hard budget cap: €{(budgetCents / 100).toFixed(2)}/month.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">This month</span>
          <span className="text-lg font-semibold tabular-nums">
            €{(spentCents / 100).toFixed(2)} / €{(budgetCents / 100).toFixed(2)}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full ${pct >= 90 ? "bg-destructive" : pct >= 75 ? "bg-warning" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{pct}% of monthly budget used.</p>
      </div>

      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        No AI generations recorded yet — this page reflects the <span className="font-mono">AiCost</span>{" "}
        ledger in real time as generation features land in later phases. 50%/75%/90% alerts and a
        configurable hard stop at 100% are enforced server-side wherever a costed generation is
        triggered.
      </div>
    </div>
  );
}

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

async function getTodayCounts(workspaceId: string) {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const [scheduledToday, awaitingApproval, scheduled, publishedToday, failedToday] =
    await Promise.all([
      prisma.post.count({
        where: {
          brand: { workspaceId },
          scheduledAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.post.count({
        where: { brand: { workspaceId }, status: "AWAITING_APPROVAL" },
      }),
      prisma.post.count({
        where: { brand: { workspaceId }, status: "SCHEDULED" },
      }),
      prisma.post.count({
        where: {
          brand: { workspaceId },
          status: "PUBLISHED",
          publishedAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.post.count({
        where: {
          brand: { workspaceId },
          status: "FAILED",
          updatedAt: { gte: todayStart, lte: todayEnd },
        },
      }),
    ]);

  return { scheduledToday, awaitingApproval, scheduled, publishedToday, failedToday };
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  const counts = await getTodayCounts(session!.workspaceId);
  const brandCount = await prisma.brand.count({ where: { workspaceId: session!.workspaceId } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">PlannerVids</h1>
        <p className="text-sm text-muted-foreground">Social Media Command Center</p>
      </div>

      {brandCount === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No brands yet. Head to <span className="font-medium text-foreground">Brands</span> to
          create your first one, or run the dev seed script to load demo data.
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Today
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Scheduled today" value={counts.scheduledToday} />
          <StatCard label="Awaiting approval" value={counts.awaitingApproval} />
          <StatCard label="Scheduled" value={counts.scheduled} />
          <StatCard label="Published today" value={counts.publishedToday} />
          <StatCard label="Failed today" value={counts.failedToday} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Performance
        </h2>
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No analytics connected yet — figures will show as{" "}
          <span className="font-mono">unavailable</span> per metric until a platform connector
          reports real data. PlannerVids never substitutes 0 for a metric it hasn&apos;t measured.
        </div>
      </section>
    </div>
  );
}

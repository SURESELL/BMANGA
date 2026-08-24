import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function LogsPage() {
  const session = await getSession();
  const logs = await prisma.auditLog.findMany({
    where: { workspaceId: session!.workspaceId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: true },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Most recent 50 events in this workspace.</p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No events recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Entity</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b last:border-0">
                  <td className="px-3 py-2 text-muted-foreground">
                    {log.createdAt.toISOString()}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{log.action}</td>
                  <td className="px-3 py-2">{log.user?.email ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {log.entityType ? `${log.entityType}:${log.entityId}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

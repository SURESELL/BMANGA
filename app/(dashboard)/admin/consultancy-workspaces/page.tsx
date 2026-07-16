import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { WorkspaceManager } from "./WorkspaceManager";

export const metadata = { title: "Cabinets consultants" };

export default async function ConsultancyWorkspacesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN") redirect("/dashboard");

  const workspaces = await db.consultancyWorkspace.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true, clientAccess: true } },
      members: { select: { id: true, email: true, name: true }, take: 5 },
    },
  });

  const initialWorkspaces = workspaces.map((w) => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    createdAt: w.createdAt.toISOString(),
    memberCount: w._count.members,
    clientCount: w._count.clientAccess,
    members: w.members,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cabinets consultants</h1>
        <p className="text-sm text-gray-500 mt-1">
          Provisionnement des espaces consultant PREUVIA — seul un Super Admin peut créer un cabinet.
        </p>
      </div>
      <WorkspaceManager initialWorkspaces={initialWorkspaces} />
    </div>
  );
}

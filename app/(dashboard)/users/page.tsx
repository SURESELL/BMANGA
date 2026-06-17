import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { UserPlus, Mail, Shield } from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import { getRoleLabel } from "@/lib/rbac";
import type { UserRole } from "@/types";

export const metadata = { title: "Utilisateurs" };

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const users = orgId
    ? await db.user.findMany({
        where: { organizationId: orgId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, firstName: true, lastName: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-1">{users.length} utilisateur{users.length > 1 ? "s" : ""}</p>
        </div>
        <button className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors">
          <UserPlus className="w-4 h-4" /> Inviter un utilisateur
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Utilisateur</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rôle</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Dernière connexion</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">Aucun utilisateur</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {getInitials(user.name ?? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name ?? "—"}
                        </p>
                        <p className="text-xs text-gray-400 md:hidden">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-700">{getRoleLabel(user.role as UserRole)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell text-xs">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Jamais"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {user.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-gray-400 hover:text-gray-600 text-xs hover:underline">Modifier</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

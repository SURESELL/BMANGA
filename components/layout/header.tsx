"use client";

import { Bell, Search, ChevronDown, LogOut, Settings, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { getInitials } from "@/lib/utils";
import { getRoleLabel } from "@/lib/rbac";
import type { UserRole } from "@/types";

interface HeaderUser {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export function DashboardHeader({ user }: { user: HeaderUser }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const userRole = ((user as { role?: string }).role ?? "EMPLOYEE") as UserRole;

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center gap-4 px-4 lg:px-6 shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-xs font-bold">
              {user.name ? getInitials(user.name) : "U"}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-medium text-gray-900 leading-tight">{user.name ?? "Utilisateur"}</p>
              <p className="text-xs text-gray-500">{getRoleLabel(userRole)}</p>
            </div>
            <ChevronDown className="w-3 h-3 text-gray-400 hidden lg:block" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-lg z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <div className="py-1">
                  <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <User className="w-4 h-4" /> Mon profil
                  </button>
                  <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <Settings className="w-4 h-4" /> Paramètres
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Déconnexion
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

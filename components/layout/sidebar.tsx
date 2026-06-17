"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck, LayoutDashboard, AlertTriangle, ClipboardList,
  BookOpen, CheckSquare, FileText, BarChart3, Settings,
  Building2, Users, HardHat, Leaf, Truck, Award, CreditCard,
  ChevronDown, ChevronRight, Menu, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: Omit<NavItem, "children">[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Général",
    items: [
      { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
      { label: "Organisations", href: "/organizations", icon: Building2 },
      { label: "Sites & Unités", href: "/sites", icon: Building2 },
      { label: "Utilisateurs", href: "/users", icon: Users },
    ],
  },
  {
    title: "HSE",
    items: [
      { label: "DUERP", href: "/duerp", icon: ShieldCheck },
      { label: "Risques", href: "/risks", icon: AlertTriangle },
      { label: "Plans d'action", href: "/action-plans", icon: ClipboardList },
      { label: "Incidents", href: "/incidents", icon: AlertTriangle },
      { label: "EPI / Vérifications", href: "/epi", icon: HardHat },
    ],
  },
  {
    title: "Formation",
    items: [
      { label: "Formations", href: "/training", icon: BookOpen },
      { label: "Quiz", href: "/quiz", icon: CheckSquare },
      { label: "Certificats", href: "/certificates", icon: Award },
    ],
  },
  {
    title: "Qualité & Audit",
    items: [
      { label: "Audits", href: "/audits", icon: ClipboardList },
      { label: "Non-conformités", href: "/non-conformities", icon: AlertTriangle },
      { label: "Qualiopi", href: "/qualiopi", icon: Award },
    ],
  },
  {
    title: "Environnement & Réglementation",
    items: [
      { label: "Environnement", href: "/environment", icon: Leaf },
      { label: "TMD / ADR", href: "/tmd", icon: Truck },
      { label: "Réglementation", href: "/regulation", icon: FileText },
    ],
  },
  {
    title: "Reporting",
    items: [
      { label: "Documents", href: "/documents", icon: FileText },
      { label: "Tableaux de bord", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Abonnement", href: "/billing", icon: CreditCard },
      { label: "Paramètres", href: "/settings", icon: Settings },
    ],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3 left-3 z-50 lg:hidden p-2 bg-[#1E3A5F] text-white rounded-lg shadow-md"
      >
        {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:relative z-40 lg:z-auto h-full bg-[#0D1B2A] text-white flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#1E3A5F] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          {!collapsed && <span className="font-bold text-lg tracking-tight">NORMIA</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto hidden lg:flex text-white/40 hover:text-white transition-colors"
          >
            <ChevronRight className={cn("w-4 h-4 transition-transform", collapsed ? "" : "rotate-180")} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              {!collapsed && (
                <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors group",
                      active
                        ? "bg-[#1E3A5F] text-white"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="ml-auto text-xs bg-red-500 text-white px-1.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="px-4 py-3 border-t border-white/10 text-xs text-white/30">
            NORMIA v0.1 — MVP
          </div>
        )}
      </aside>
    </>
  );
}

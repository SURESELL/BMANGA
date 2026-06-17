import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: "blue" | "green" | "orange" | "red" | "purple";
  href?: string;
}

export function StatsCard({ title, value, subtitle, icon: Icon, trend, color = "blue", href }: StatsCardProps) {
  const colors = {
    blue:   { bg: "bg-blue-50",   icon: "bg-blue-100 text-blue-600",   text: "text-blue-600" },
    green:  { bg: "bg-green-50",  icon: "bg-green-100 text-green-600",  text: "text-green-600" },
    orange: { bg: "bg-orange-50", icon: "bg-orange-100 text-orange-600", text: "text-orange-600" },
    red:    { bg: "bg-red-50",    icon: "bg-red-100 text-red-600",    text: "text-red-600" },
    purple: { bg: "bg-purple-50", icon: "bg-purple-100 text-purple-600", text: "text-purple-600" },
  };
  const c = colors[color];

  const content = (
    <div className={cn("bg-white border border-gray-200 rounded-xl p-5 transition-all", href && "hover:shadow-md hover:border-gray-300 cursor-pointer")}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", c.icon)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          <span className={cn("text-xs font-medium", trend.value >= 0 ? "text-green-600" : "text-red-600")}>
            {trend.value >= 0 ? "+" : ""}{trend.value}%
          </span>
          <span className="text-xs text-gray-400">{trend.label}</span>
        </div>
      )}
    </div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }
  return content;
}

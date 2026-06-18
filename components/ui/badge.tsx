import { cn } from "@/lib/utils";
import type { RiskLevel, ActionStatus, ComplianceLevel } from "@/types";
import { RISK_LEVELS, ACTION_STATUS_LABELS, COMPLIANCE_LEVELS } from "@/types";

export function RiskBadge({ level }: { level: RiskLevel }) {
  const config = RISK_LEVELS[level];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", config.bg, config.color)}>
      {config.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: ActionStatus }) {
  const config = ACTION_STATUS_LABELS[status];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100", config.color)}>
      {config.label}
    </span>
  );
}

export function ComplianceBadge({ level }: { level: ComplianceLevel }) {
  const config = COMPLIANCE_LEVELS[level];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", config.bg, config.color)}>
      {config.label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const configs: Record<string, { label: string; bg: string; color: string }> = {
    NEAR_MISS:    { label: "Presque accident", bg: "bg-gray-100",   color: "text-gray-600" },
    MINOR:        { label: "Mineur",           bg: "bg-yellow-100", color: "text-yellow-700" },
    SIGNIFICANT:  { label: "Significatif",     bg: "bg-orange-100", color: "text-orange-700" },
    SERIOUS:      { label: "Grave",            bg: "bg-red-100",    color: "text-red-700" },
    CRITICAL:     { label: "Critique",         bg: "bg-red-200",    color: "text-red-800" },
    FATAL:        { label: "Mortel",           bg: "bg-black",      color: "text-white" },
  };
  const c = configs[severity] ?? configs.MINOR;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", c.bg, c.color)}>
      {c.label}
    </span>
  );
}

export function TrainingTypeBadge({ type }: { type: string }) {
  const configs: Record<string, { label: string; bg: string; color: string }> = {
    E_LEARNING:    { label: "E-learning",     bg: "bg-purple-100", color: "text-purple-700" },
    FACE_TO_FACE:  { label: "Présentiel",     bg: "bg-blue-100",   color: "text-blue-700" },
    HYBRID:        { label: "Hybride",        bg: "bg-teal-100",   color: "text-teal-700" },
    VIRTUAL_CLASS: { label: "Classe virtuelle", bg: "bg-indigo-100", color: "text-indigo-700" },
    WEBINAR:       { label: "Webinaire",      bg: "bg-sky-100",    color: "text-sky-700" },
  };
  const c = configs[type] ?? configs.E_LEARNING;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", c.bg, c.color)}>
      {c.label}
    </span>
  );
}

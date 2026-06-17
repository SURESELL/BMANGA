import type { UserRole } from "@/types";

// Role hierarchy: higher index = more permissions
const ROLE_HIERARCHY: UserRole[] = [
  "VIEWER",
  "LEARNER",
  "EMPLOYEE",
  "TRAINER",
  "AUDITOR",
  "CONSULTANT",
  "SITE_MANAGER",
  "ORG_ADMIN",
  "SUPER_ADMIN",
];

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}

type Module =
  | "duerp" | "risks" | "incidents" | "action_plans"
  | "documents" | "training" | "quiz" | "certificates"
  | "audits" | "qualiopi" | "regulation" | "haccp"
  | "environment" | "tmd" | "esg" | "settings"
  | "billing" | "users" | "organizations";

type Action = "view" | "create" | "update" | "delete" | "export" | "validate";

const PERMISSIONS: Record<Module, Record<Action, UserRole[]>> = {
  duerp:         { view: ["VIEWER"], create: ["SITE_MANAGER"], update: ["SITE_MANAGER"], delete: ["ORG_ADMIN"], export: ["EMPLOYEE"], validate: ["ORG_ADMIN"] },
  risks:         { view: ["VIEWER"], create: ["EMPLOYEE"], update: ["EMPLOYEE"], delete: ["SITE_MANAGER"], export: ["EMPLOYEE"], validate: ["SITE_MANAGER"] },
  incidents:     { view: ["VIEWER"], create: ["EMPLOYEE"], update: ["EMPLOYEE"], delete: ["SITE_MANAGER"], export: ["SITE_MANAGER"], validate: ["SITE_MANAGER"] },
  action_plans:  { view: ["VIEWER"], create: ["EMPLOYEE"], update: ["EMPLOYEE"], delete: ["SITE_MANAGER"], export: ["SITE_MANAGER"], validate: ["SITE_MANAGER"] },
  documents:     { view: ["VIEWER"], create: ["EMPLOYEE"], update: ["EMPLOYEE"], delete: ["SITE_MANAGER"], export: ["EMPLOYEE"], validate: ["SITE_MANAGER"] },
  training:      { view: ["LEARNER"], create: ["TRAINER"], update: ["TRAINER"], delete: ["ORG_ADMIN"], export: ["TRAINER"], validate: ["ORG_ADMIN"] },
  quiz:          { view: ["LEARNER"], create: ["TRAINER"], update: ["TRAINER"], delete: ["TRAINER"], export: ["TRAINER"], validate: ["TRAINER"] },
  certificates:  { view: ["LEARNER"], create: ["TRAINER"], update: ["ORG_ADMIN"], delete: ["ORG_ADMIN"], export: ["LEARNER"], validate: ["TRAINER"] },
  audits:        { view: ["VIEWER"], create: ["AUDITOR"], update: ["AUDITOR"], delete: ["ORG_ADMIN"], export: ["AUDITOR"], validate: ["ORG_ADMIN"] },
  qualiopi:      { view: ["VIEWER"], create: ["ORG_ADMIN"], update: ["ORG_ADMIN"], delete: ["ORG_ADMIN"], export: ["ORG_ADMIN"], validate: ["ORG_ADMIN"] },
  regulation:    { view: ["VIEWER"], create: ["SUPER_ADMIN"], update: ["SUPER_ADMIN"], delete: ["SUPER_ADMIN"], export: ["VIEWER"], validate: ["SUPER_ADMIN"] },
  haccp:         { view: ["VIEWER"], create: ["SITE_MANAGER"], update: ["SITE_MANAGER"], delete: ["ORG_ADMIN"], export: ["SITE_MANAGER"], validate: ["ORG_ADMIN"] },
  environment:   { view: ["VIEWER"], create: ["SITE_MANAGER"], update: ["SITE_MANAGER"], delete: ["ORG_ADMIN"], export: ["SITE_MANAGER"], validate: ["ORG_ADMIN"] },
  tmd:           { view: ["VIEWER"], create: ["SITE_MANAGER"], update: ["SITE_MANAGER"], delete: ["ORG_ADMIN"], export: ["SITE_MANAGER"], validate: ["ORG_ADMIN"] },
  esg:           { view: ["VIEWER"], create: ["ORG_ADMIN"], update: ["ORG_ADMIN"], delete: ["ORG_ADMIN"], export: ["ORG_ADMIN"], validate: ["ORG_ADMIN"] },
  settings:      { view: ["ORG_ADMIN"], create: ["ORG_ADMIN"], update: ["ORG_ADMIN"], delete: ["ORG_ADMIN"], export: ["ORG_ADMIN"], validate: ["ORG_ADMIN"] },
  billing:       { view: ["ORG_ADMIN"], create: ["ORG_ADMIN"], update: ["ORG_ADMIN"], delete: ["SUPER_ADMIN"], export: ["ORG_ADMIN"], validate: ["SUPER_ADMIN"] },
  users:         { view: ["SITE_MANAGER"], create: ["ORG_ADMIN"], update: ["ORG_ADMIN"], delete: ["ORG_ADMIN"], export: ["ORG_ADMIN"], validate: ["ORG_ADMIN"] },
  organizations: { view: ["ORG_ADMIN"], create: ["SUPER_ADMIN"], update: ["ORG_ADMIN"], delete: ["SUPER_ADMIN"], export: ["ORG_ADMIN"], validate: ["SUPER_ADMIN"] },
};

export function canAccess(userRole: UserRole, module: Module, action: Action): boolean {
  const requiredRole = PERMISSIONS[module]?.[action];
  if (!requiredRole) return false;
  return hasRole(userRole, requiredRole[0]);
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    SUPER_ADMIN:  "Super Administrateur",
    ORG_ADMIN:    "Administrateur",
    SITE_MANAGER: "Responsable site",
    EMPLOYEE:     "Employé",
    TRAINER:      "Formateur",
    LEARNER:      "Apprenant",
    CONSULTANT:   "Consultant QHSE",
    AUDITOR:      "Auditeur",
    VIEWER:       "Lecteur",
  };
  return labels[role] ?? role;
}

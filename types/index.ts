// NORMIA - Core TypeScript Types

export type UserRole =
  | "SUPER_ADMIN"
  | "ORG_ADMIN"
  | "SITE_MANAGER"
  | "EMPLOYEE"
  | "TRAINER"
  | "LEARNER"
  | "CONSULTANT"
  | "AUDITOR"
  | "VIEWER";

export type RiskLevel = "NEGLIGIBLE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ActionStatus = "DRAFT" | "TODO" | "IN_PROGRESS" | "DONE" | "OVERDUE" | "CANCELED";
export type ComplianceLevel = "COMPLIANT" | "PARTIAL" | "NON_COMPLIANT" | "NOT_APPLICABLE" | "TO_EVALUATE";

export interface NavItem {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavItem[];
  roles?: UserRole[];
}

export interface DashboardStats {
  complianceScore: number;
  riskScore: number;
  trainingUpToDate: number;
  overdueActions: number;
  openIncidents: number;
  pendingAudits: number;
  openNonConformities: number;
  missingEvidences: number;
  criticalObligations: number;
}

export interface RiskCotation {
  frequency: number; // 1-5
  gravity: number;   // 1-5
  mastery: number;   // 1-3
  score: number;     // calculé
  level: RiskLevel;
}

export const RISK_LEVELS: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  NEGLIGIBLE: { label: "Négligeable", color: "text-gray-600", bg: "bg-gray-100" },
  LOW:        { label: "Faible",      color: "text-green-700", bg: "bg-green-100" },
  MEDIUM:     { label: "Moyen",       color: "text-yellow-700", bg: "bg-yellow-100" },
  HIGH:       { label: "Élevé",       color: "text-orange-700", bg: "bg-orange-100" },
  CRITICAL:   { label: "Critique",    color: "text-red-700",    bg: "bg-red-100" },
};

export const RISK_FAMILIES = [
  { code: "CHUTE_PLAIN_PIED", label: "Chute de plain-pied" },
  { code: "CHUTE_HAUTEUR", label: "Chute de hauteur" },
  { code: "MANUTENTION", label: "Manutention manuelle" },
  { code: "TMS", label: "Troubles musculosquelettiques (TMS)" },
  { code: "CHIMIQUE", label: "Risques chimiques" },
  { code: "BIOLOGIQUE", label: "Risques biologiques" },
  { code: "ELECTRIQUE", label: "Risques électriques" },
  { code: "INCENDIE", label: "Incendie / Explosion" },
  { code: "MACHINES", label: "Machines et équipements" },
  { code: "CIRCULATION", label: "Circulation interne" },
  { code: "ROUTIER", label: "Risque routier" },
  { code: "BRUIT", label: "Bruit" },
  { code: "VIBRATIONS", label: "Vibrations" },
  { code: "THERMIQUE", label: "Ambiance thermique" },
  { code: "ECLAIRAGE", label: "Éclairage" },
  { code: "ECRAN", label: "Travail sur écran" },
  { code: "TELETRAVAIL", label: "Télétravail" },
  { code: "RPS", label: "Risques psychosociaux (RPS)" },
  { code: "COACTIVITE", label: "Coactivité / entreprises extérieures" },
  { code: "TRAVAIL_ISOLE", label: "Travail isolé" },
  { code: "ATEX", label: "Atmosphères explosives (ATEX)" },
  { code: "RAYONNEMENTS", label: "Rayonnements" },
  { code: "HYGIENE", label: "Hygiène" },
  { code: "ORGANISATION", label: "Organisation du travail" },
  { code: "ENTREPOT", label: "Sécurité entrepôt" },
  { code: "CYBER", label: "Risques cyber" },
  { code: "MINEURS", label: "Travailleurs mineurs" },
  { code: "FEMMES_ENCEINTES", label: "Femmes enceintes / allaitantes" },
  { code: "HANDICAP", label: "Travailleurs handicapés" },
] as const;

export type RiskFamilyCode = typeof RISK_FAMILIES[number]["code"];

export const ACTION_STATUS_LABELS: Record<ActionStatus, { label: string; color: string }> = {
  DRAFT:       { label: "Brouillon",    color: "text-gray-500" },
  TODO:        { label: "À faire",      color: "text-blue-600" },
  IN_PROGRESS: { label: "En cours",     color: "text-yellow-600" },
  DONE:        { label: "Terminé",      color: "text-green-600" },
  OVERDUE:     { label: "En retard",    color: "text-red-600" },
  CANCELED:    { label: "Annulé",       color: "text-gray-400" },
};

export const COMPLIANCE_LEVELS: Record<ComplianceLevel, { label: string; color: string; bg: string }> = {
  COMPLIANT:       { label: "Conforme",         color: "text-green-700",  bg: "bg-green-100" },
  PARTIAL:         { label: "Partiel",           color: "text-yellow-700", bg: "bg-yellow-100" },
  NON_COMPLIANT:   { label: "Non conforme",      color: "text-red-700",    bg: "bg-red-100" },
  NOT_APPLICABLE:  { label: "Non applicable",    color: "text-gray-500",   bg: "bg-gray-100" },
  TO_EVALUATE:     { label: "À évaluer",         color: "text-blue-600",   bg: "bg-blue-100" },
};

export const SUBSCRIPTION_PLANS = {
  FREE:         { label: "Gratuit",       price: 0,   seats: 3,  modules: ["core", "duerp"] },
  STARTER:      { label: "Starter",       price: 49,  seats: 10, modules: ["core", "duerp", "incidents", "documents"] },
  PROFESSIONAL: { label: "Professionnel", price: 149, seats: 50, modules: ["core", "duerp", "incidents", "documents", "lms", "audits", "qualiopi"] },
  ENTERPRISE:   { label: "Entreprise",    price: 399, seats: -1, modules: ["all"] },
} as const;

export const NORMIA_DISCLAIMER =
  "⚠️ À vérifier avec la source officielle applicable et validation expert avant tout usage juridique ou réglementaire.";

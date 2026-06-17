import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Settings, Building2, Bell, Shield, Users, Globe } from "lucide-react";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  const org = orgId ? await db.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, email: true, phone: true, siret: true, sector: true, address: true, city: true, postalCode: true },
  }) : null;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-sm text-gray-500 mt-1">Gérez les paramètres de votre organisation et compte</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SETTING_SECTIONS.map((section) => (
          <a key={section.href} href={section.href} className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:border-[#1E3A5F] hover:shadow-sm transition-all group">
            <div className={`w-9 h-9 rounded-lg ${section.bg} flex items-center justify-center shrink-0`}>
              <section.icon className={`w-4 h-4 ${section.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{section.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{section.description}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Organisation info */}
      {org && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Informations de l&apos;organisation</h2>
            <button className="text-sm text-[#1E3A5F] hover:underline">Modifier</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow label="Nom" value={org.name} />
            <InfoRow label="Email" value={org.email} />
            <InfoRow label="Téléphone" value={org.phone} />
            <InfoRow label="SIRET" value={org.siret} />
            <InfoRow label="Secteur" value={org.sector} />
            <InfoRow label="Adresse" value={[org.address, org.postalCode, org.city].filter(Boolean).join(", ")} />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-900 mt-0.5">{value || <span className="text-gray-400">—</span>}</p>
    </div>
  );
}

const SETTING_SECTIONS = [
  { title: "Organisation", description: "Nom, logo, infos légales", href: "/settings/organization", icon: Building2, bg: "bg-blue-100", color: "text-blue-600" },
  { title: "Utilisateurs & Rôles", description: "Gérer les accès", href: "/settings/users", icon: Users, bg: "bg-purple-100", color: "text-purple-600" },
  { title: "Notifications", description: "Alertes et emails", href: "/settings/notifications", icon: Bell, bg: "bg-yellow-100", color: "text-yellow-600" },
  { title: "Sécurité", description: "Mot de passe, 2FA", href: "/settings/security", icon: Shield, bg: "bg-red-100", color: "text-red-600" },
  { title: "Intégrations", description: "API, webhooks", href: "/settings/integrations", icon: Globe, bg: "bg-green-100", color: "text-green-600" },
  { title: "Paramètres avancés", description: "Modules, configuration", href: "/settings/advanced", icon: Settings, bg: "bg-gray-100", color: "text-gray-600" },
];

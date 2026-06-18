import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { CheckCircle, Circle, ArrowRight, Building2, Users, ShieldCheck, ClipboardList, BookOpen } from "lucide-react";

export const metadata = { title: "Démarrage" };

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  completed: boolean;
}

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session.user as { organizationId?: string })?.organizationId;
  if (!orgId) redirect("/login");

  const [org, sitesCount, usersCount, risksCount, trainingCount] = await Promise.all([
    db.organization.findUnique({ where: { id: orgId } }),
    db.site.count({ where: { organizationId: orgId } }),
    db.user.count({ where: { organizationId: orgId, isActive: true } }),
    db.risk.count({ where: { organizationId: orgId } }),
    db.trainingCourse.count({ where: { organizationId: orgId } }),
  ]);

  const steps: OnboardingStep[] = [
    {
      id: "organization",
      title: "Configurer votre organisation",
      description: "Renseignez les informations de votre entreprise : secteur, taille, adresse.",
      href: "/settings/organization",
      icon: Building2,
      completed: !!(org?.sector && org?.employeeCount),
    },
    {
      id: "sites",
      title: "Ajouter vos sites / établissements",
      description: "Créez au moins un site pour localiser vos risques et incidents.",
      href: "/sites/new",
      icon: Building2,
      completed: sitesCount > 0,
    },
    {
      id: "users",
      title: "Inviter vos collaborateurs",
      description: "Ajoutez votre équipe et attribuez les rôles appropriés.",
      href: "/settings/users",
      icon: Users,
      completed: usersCount > 1,
    },
    {
      id: "risks",
      title: "Créer votre premier DUERP",
      description: "Commencez l'évaluation des risques professionnels avec notre assistant.",
      href: "/duerp/new",
      icon: ShieldCheck,
      completed: risksCount > 0,
    },
    {
      id: "audit",
      title: "Planifier votre premier audit",
      description: "Planifiez un audit interne ou de conformité.",
      href: "/audits/new",
      icon: ClipboardList,
      completed: false,
    },
    {
      id: "training",
      title: "Créer une formation",
      description: "Publiez votre première formation ou module e-learning.",
      href: "/training/new",
      icon: BookOpen,
      completed: trainingCount > 0,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bienvenue sur NORMIA</h1>
        <p className="text-sm text-gray-500 mt-1">
          Suivez ces étapes pour configurer votre espace de travail.
        </p>
      </div>

      {/* Progress */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">Progression</p>
          <p className="text-sm font-bold text-[#1E3A5F]">{completedCount}/{steps.length} étapes</p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full bg-[#1E3A5F] transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {progressPct === 100 && (
          <p className="text-sm text-green-600 font-medium mt-2 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> Configuration terminée !
          </p>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <a
              key={step.id}
              href={step.completed ? "#" : step.href}
              className={`block bg-white border rounded-xl p-5 transition-all ${
                step.completed
                  ? "border-green-200 bg-green-50/30 cursor-default"
                  : "border-gray-200 hover:border-[#1E3A5F] hover:shadow-sm"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-0.5">
                  {step.completed ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium">Étape {idx + 1}</span>
                    {step.completed && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Fait</span>
                    )}
                  </div>
                  <p className={`font-medium mt-0.5 ${step.completed ? "text-gray-400 line-through" : "text-gray-900"}`}>
                    {step.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">{step.description}</p>
                </div>
                {!step.completed && (
                  <div className="flex items-center gap-1 text-[#1E3A5F] shrink-0">
                    <Icon className="w-4 h-4" />
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            </a>
          );
        })}
      </div>

      <div className="text-center">
        <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 underline">
          Passer cette étape, aller au tableau de bord
        </a>
      </div>
    </div>
  );
}

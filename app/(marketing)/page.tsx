import Link from "next/link";
import {
  ShieldCheck, BookOpen, ClipboardList, BarChart3, AlertTriangle,
  CheckCircle, ArrowRight, Building2, Users, Award
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1E3A5F] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[#0D1B2A]">NORMIA</span>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
              <Link href="/pricing" className="hover:text-[#1E3A5F] transition-colors">Tarifs</Link>
              <Link href="/modules" className="hover:text-[#1E3A5F] transition-colors">Modules</Link>
              <Link href="/about" className="hover:text-[#1E3A5F] transition-colors">À propos</Link>
            </nav>
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm text-gray-600 hover:text-[#1E3A5F] transition-colors px-4 py-2">
                Connexion
              </Link>
              <Link href="/register" className="text-sm bg-[#1E3A5F] text-white px-4 py-2 rounded-lg hover:bg-[#0D1B2A] transition-colors">
                Essai gratuit
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#0D1B2A] via-[#1E3A5F] to-[#0D1B2A] text-white py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 bg-blue-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 text-sm px-4 py-1.5 rounded-full mb-6">
            <CheckCircle className="w-4 h-4 text-green-400" />
            Plateforme certifiée RGPD — Données hébergées en France
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Maîtrisez votre conformité<br />
            <span className="text-blue-300">HSE, Formation & Qualité</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/70 max-w-3xl mx-auto mb-10">
            NORMIA centralise la gestion des risques professionnels, la formation réglementaire,
            la conformité Qualiopi et le pilotage qualité dans une seule plateforme SaaS sécurisée.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="inline-flex items-center gap-2 bg-white text-[#1E3A5F] px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-blue-50 transition-colors shadow-lg">
              Démarrer gratuitement
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/demo" className="inline-flex items-center gap-2 border border-white/30 text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-white/10 transition-colors">
              Voir une démo
            </Link>
          </div>
          <p className="text-sm text-white/50 mt-4">14 jours d&apos;essai • Sans carte bancaire • Résiliation libre</p>
        </div>
      </section>

      {/* Modules */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-[#0D1B2A] mb-4">Une plateforme, tous vos enjeux de conformité</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Des modules intégrés couvrant l&apos;ensemble de votre démarche réglementaire et qualité.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MODULES.map((mod) => (
              <div key={mod.title} className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-md transition-all group">
                <div className={`w-12 h-12 rounded-xl ${mod.bg} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                  <mod.icon className={`w-6 h-6 ${mod.color}`} />
                </div>
                <h3 className="font-semibold text-[#0D1B2A] mb-2">{mod.title}</h3>
                <p className="text-sm text-gray-500">{mod.description}</p>
                <div className="mt-4 flex flex-wrap gap-1">
                  {mod.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-[#1E3A5F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-white text-center">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl font-bold text-blue-300 mb-2">{stat.value}</div>
                <div className="text-white/70 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-[#0D1B2A] mb-4">Des tarifs adaptés à votre taille</h2>
          <p className="text-gray-600 mb-12">De la TPE à l&apos;ETI, NORMIA s&apos;adapte à vos besoins.</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {PRICING.map((plan) => (
              <div key={plan.name} className={`border rounded-xl p-6 ${plan.featured ? "border-[#1E3A5F] shadow-lg bg-[#1E3A5F] text-white" : "border-gray-200 bg-white"}`}>
                <div className="text-sm font-medium mb-1 opacity-70">{plan.name}</div>
                <div className="text-3xl font-bold mb-1">
                  {plan.price === 0 ? "Gratuit" : `${plan.price}€`}
                </div>
                {plan.price > 0 && <div className="text-xs opacity-60 mb-4">/mois HT</div>}
                <ul className="text-sm space-y-2 text-left mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${plan.featured ? "text-blue-300" : "text-green-500"}`} />
                      <span className={plan.featured ? "text-white/80" : "text-gray-600"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block text-center text-sm font-medium py-2 rounded-lg transition-colors ${
                    plan.featured
                      ? "bg-white text-[#1E3A5F] hover:bg-blue-50"
                      : "bg-[#1E3A5F] text-white hover:bg-[#0D1B2A]"
                  }`}
                >
                  Commencer
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/pricing" className="text-[#1E3A5F] text-sm font-medium hover:underline inline-flex items-center gap-1">
              Voir tous les détails des tarifs <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0D1B2A] text-white/60 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[#1E3A5F] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold">NORMIA</span>
              </div>
              <p className="text-xs">Plateforme professionnelle de conformité réglementaire.</p>
            </div>
            {FOOTER_LINKS.map((col) => (
              <div key={col.title}>
                <h4 className="text-white text-sm font-medium mb-3">{col.title}</h4>
                <ul className="space-y-2 text-xs">
                  {col.links.map((link) => (
                    <li key={link.label}><Link href={link.href} className="hover:text-white transition-colors">{link.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
            <p>© {new Date().getFullYear()} NORMIA. Tous droits réservés.</p>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-white">Politique de confidentialité</Link>
              <Link href="/terms" className="hover:text-white">CGU</Link>
              <Link href="/legal" className="hover:text-white">Mentions légales</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const MODULES = [
  {
    icon: ShieldCheck,
    title: "NORMIA HSE / DUERP",
    description: "Évaluation des risques, document unique, plans d'action, incidents, EPI, vérifications périodiques.",
    bg: "bg-blue-100", color: "text-blue-700",
    tags: ["DUERP", "Risques", "Incidents", "EPI"],
  },
  {
    icon: BookOpen,
    title: "NORMIA Academy / LMS",
    description: "E-learning, formations présentielles, hybrides, quiz, attestations, suivi pédagogique complet.",
    bg: "bg-purple-100", color: "text-purple-700",
    tags: ["E-learning", "Quiz", "Attestations", "Qualiopi"],
  },
  {
    icon: ClipboardList,
    title: "NORMIA Audit",
    description: "Audits internes, checklists, constats, non-conformités, plans d'action, rapports PDF.",
    bg: "bg-orange-100", color: "text-orange-700",
    tags: ["Audits", "NC", "Checklists"],
  },
  {
    icon: BarChart3,
    title: "NORMIA Data",
    description: "Tableaux de bord, KPI conformité, scores risque, comparaisons multi-sites, alertes.",
    bg: "bg-green-100", color: "text-green-700",
    tags: ["KPI", "Dashboard", "Alertes"],
  },
  {
    icon: AlertTriangle,
    title: "NORMIA Food / HACCP",
    description: "PMS, BPH, CCP, PRPo, traçabilité, allergènes, non-conformités alimentaires.",
    bg: "bg-yellow-100", color: "text-yellow-700",
    tags: ["HACCP", "PMS", "Traçabilité"],
  },
  {
    icon: Building2,
    title: "NORMIA Reg",
    description: "Moteur réglementaire, obligations, sources officielles, preuves, alertes de mise à jour.",
    bg: "bg-red-100", color: "text-red-700",
    tags: ["Réglementation", "Obligations", "Veille"],
  },
];

const STATS = [
  { value: "50+", label: "Modules réglementaires" },
  { value: "200+", label: "Familles de risques" },
  { value: "7", label: "Critères Qualiopi" },
  { value: "RGPD", label: "Conforme dès la conception" },
];

const PRICING = [
  {
    name: "Gratuit",
    price: 0,
    featured: false,
    features: ["3 utilisateurs", "DUERP basique", "5 formations"],
  },
  {
    name: "Starter",
    price: 49,
    featured: false,
    features: ["10 utilisateurs", "DUERP complet", "Incidents", "Documents"],
  },
  {
    name: "Pro",
    price: 149,
    featured: true,
    features: ["50 utilisateurs", "LMS complet", "Qualiopi", "Audits", "API"],
  },
  {
    name: "Entreprise",
    price: 399,
    featured: false,
    features: ["Illimité", "Tous modules", "SSO", "SLA premium"],
  },
];

const FOOTER_LINKS = [
  {
    title: "Produit",
    links: [
      { label: "Fonctionnalités", href: "/features" },
      { label: "Tarifs", href: "/pricing" },
      { label: "Sécurité", href: "/security" },
      { label: "RGPD", href: "/rgpd" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "HSE / DUERP", href: "/solutions/hse" },
      { label: "Formation Qualiopi", href: "/solutions/qualiopi" },
      { label: "HACCP / PMS", href: "/solutions/haccp" },
      { label: "ISO 9001 / 14001", href: "/solutions/iso" },
    ],
  },
  {
    title: "Entreprise",
    links: [
      { label: "À propos", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Support", href: "/support" },
      { label: "Blog", href: "/blog" },
    ],
  },
];

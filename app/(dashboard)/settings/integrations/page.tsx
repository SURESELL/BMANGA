"use client";

const WEBHOOK_EVENTS = [
  "incident.created",
  "incident.closed",
  "risk.high",
  "training.completed",
  "audit.completed",
];

function ComingSoonBadge() {
  return (
    <span className="text-xs font-medium bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
      Bientôt disponible
    </span>
  );
}

export default function IntegrationsPage() {
  function handleComingSoon() {
    alert("Cette fonctionnalité sera disponible prochainement.");
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Intégrations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connectez NORMIA à vos outils et systèmes externes.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900">API REST NORMIA</h2>
          <p className="text-sm text-gray-500 mt-1">
            Accédez aux données de votre organisation via l&apos;API REST NORMIA sécurisée.
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Clé API</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-700 select-all">
              sk-norm-••••••••••••••••
            </code>
            <button
              onClick={handleComingSoon}
              className="shrink-0 border border-gray-300 text-sm text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Générer une clé
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-900">Webhook</h2>
          <ComingSoonBadge />
        </div>
        <p className="text-sm text-gray-500">
          Recevez des notifications HTTP en temps réel lors d&apos;événements dans NORMIA.
        </p>
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">URL de destination</p>
          <input
            type="url"
            placeholder="https://votre-serveur.com/webhook"
            disabled
            className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
          />
        </div>
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Événements</p>
          <ul className="space-y-1.5">
            {WEBHOOK_EVENTS.map((evt) => (
              <li key={evt} className="flex items-center gap-2">
                <input type="checkbox" disabled className="cursor-not-allowed" />
                <span className="text-sm text-gray-500 font-mono">{evt}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#4A154B] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Slack</h2>
              <p className="text-sm text-gray-500">Recevez des alertes NORMIA directement dans Slack.</p>
            </div>
          </div>
          <button
            onClick={handleComingSoon}
            className="shrink-0 border border-gray-300 text-sm text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Connecter
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#4B53BC] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">T</span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Microsoft Teams</h2>
              <p className="text-sm text-gray-500">Envoyez des notifications NORMIA vers vos canaux Teams.</p>
            </div>
          </div>
          <button
            onClick={handleComingSoon}
            className="shrink-0 border border-gray-300 text-sm text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Connecter
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 ${
        checked ? "bg-[#1E3A5F]" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

const NOTIFICATION_CATEGORIES = [
  { key: "incidents", label: "Incidents critiques" },
  { key: "risks", label: "Risques élevés" },
  { key: "deadlines", label: "Rappels d'échéances" },
  { key: "reports", label: "Rapports hebdomadaires" },
];

type NotifKey = "incidents" | "risks" | "deadlines" | "reports";

interface NotifState {
  email: Record<NotifKey, boolean>;
  inapp: Record<NotifKey, boolean>;
}

const defaultState: NotifState = {
  email: { incidents: true, risks: true, deadlines: true, reports: false },
  inapp: { incidents: true, risks: false, deadlines: true, reports: false },
};

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState<NotifState>(defaultState);
  const [toast, setToast] = useState(false);

  function handleToggle(channel: "email" | "inapp", key: NotifKey, val: boolean) {
    setSettings((prev) => ({
      ...prev,
      [channel]: { ...prev[channel], [key]: val },
    }));
  }

  function handleSave() {
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configurez vos préférences de notification pour NORMIA.
        </p>
      </div>

      {toast && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-4 py-3">
          Bientôt disponible — les préférences de notification seront sauvegardées prochainement.
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Notifications par email</h2>
          <p className="text-xs text-gray-500 mt-0.5">Recevez des alertes directement dans votre boîte mail.</p>
        </div>
        <ul className="divide-y divide-gray-100">
          {NOTIFICATION_CATEGORIES.map((cat) => (
            <li key={cat.key} className="flex items-center justify-between px-5 py-4">
              <span className="text-sm text-gray-700">{cat.label}</span>
              <Toggle
                checked={settings.email[cat.key as NotifKey]}
                onChange={(val) => handleToggle("email", cat.key as NotifKey, val)}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Notifications in-app</h2>
          <p className="text-xs text-gray-500 mt-0.5">Affichez des alertes dans l&apos;interface NORMIA.</p>
        </div>
        <ul className="divide-y divide-gray-100">
          {NOTIFICATION_CATEGORIES.map((cat) => (
            <li key={cat.key} className="flex items-center justify-between px-5 py-4">
              <span className="text-sm text-gray-700">{cat.label}</span>
              <Toggle
                checked={settings.inapp[cat.key as NotifKey]}
                onChange={(val) => handleToggle("inapp", cat.key as NotifKey, val)}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="bg-[#1E3A5F] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#0D1B2A] transition-colors"
        >
          Enregistrer les préférences
        </button>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Bientôt disponible</span>
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { calculateRiskScore, getRiskLevel } from "@/lib/utils";
import { RISK_LEVELS } from "@/types";
import { RiskBadge } from "@/components/ui/badge";

interface RiskCalculatorProps {
  onScoreChange?: (score: { frequency: number; gravity: number; mastery: number; score: number; level: string }) => void;
  initialValues?: { frequency?: number; gravity?: number; mastery?: number };
}

const FREQ_LABELS = ["", "Très rare (1)", "Rare (2)", "Occasionnel (3)", "Fréquent (4)", "Très fréquent (5)"];
const GRAV_LABELS = ["", "Légère (1)", "Modérée (2)", "Grave (3)", "Très grave (4)", "Catastrophique (5)"];
const MASTERY_LABELS = ["", "Bonne maîtrise (1)", "Maîtrise partielle (2)", "Maîtrise insuffisante (3)"];

export function RiskCalculator({ onScoreChange, initialValues = {} }: RiskCalculatorProps) {
  const [frequency, setFrequency] = useState(initialValues.frequency ?? 1);
  const [gravity, setGravity] = useState(initialValues.gravity ?? 1);
  const [mastery, setMastery] = useState(initialValues.mastery ?? 1);

  const score = calculateRiskScore(frequency, gravity, mastery);
  const level = getRiskLevel(score);

  const handleChange = useCallback((f: number, g: number, m: number) => {
    const s = calculateRiskScore(f, g, m);
    const l = getRiskLevel(s);
    onScoreChange?.({ frequency: f, gravity: g, mastery: m, score: s, level: l });
  }, [onScoreChange]);

  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4">
      <h3 className="font-semibold text-gray-900">Cotation du risque</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fréquence d&apos;exposition <span className="text-red-500">*</span>
          </label>
          <select
            value={frequency}
            onChange={(e) => {
              const v = Number(e.target.value);
              setFrequency(v);
              handleChange(v, gravity, mastery);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
          >
            {FREQ_LABELS.slice(1).map((label, i) => (
              <option key={i + 1} value={i + 1}>{label}</option>
            ))}
          </select>
        </div>

        {/* Gravity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gravité potentielle <span className="text-red-500">*</span>
          </label>
          <select
            value={gravity}
            onChange={(e) => {
              const v = Number(e.target.value);
              setGravity(v);
              handleChange(frequency, v, mastery);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
          >
            {GRAV_LABELS.slice(1).map((label, i) => (
              <option key={i + 1} value={i + 1}>{label}</option>
            ))}
          </select>
        </div>

        {/* Mastery */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maîtrise du risque <span className="text-red-500">*</span>
          </label>
          <select
            value={mastery}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMastery(v);
              handleChange(frequency, gravity, v);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
          >
            {MASTERY_LABELS.slice(1).map((label, i) => (
              <option key={i + 1} value={i + 1}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Result */}
      <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="text-center">
          <p className="text-xs text-gray-500">Score brut</p>
          <p className="text-2xl font-bold text-gray-900">{score}</p>
          <p className="text-xs text-gray-400">{frequency} × {gravity} ÷ {mastery}</p>
        </div>
        <div className="w-px h-12 bg-gray-200" />
        <div>
          <p className="text-xs text-gray-500 mb-1">Niveau de risque</p>
          <RiskBadge level={level} />
        </div>
        <div className="ml-auto">
          <div className="w-16 h-16 relative">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke={RISK_LEVELS[level].bg.replace("bg-", "").includes("red") ? "#ef4444" : RISK_LEVELS[level].bg.replace("bg-", "").includes("orange") ? "#f97316" : RISK_LEVELS[level].bg.replace("bg-", "").includes("yellow") ? "#eab308" : "#22c55e"}
                strokeWidth="3"
                strokeDasharray={`${Math.min(score / 25 * 100, 100)} 100`}
              />
            </svg>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Formule : Score = Fréquence × Gravité ÷ Maîtrise (arrondi à l&apos;entier)
      </p>
    </div>
  );
}

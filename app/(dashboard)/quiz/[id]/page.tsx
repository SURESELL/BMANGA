"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Clock, ChevronRight, ChevronLeft, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

interface Answer { id: string; text: string; order: number }
interface Question { id: string; text: string; type: string; points: number; answers: Answer[] }
interface Quiz {
  id: string; title: string; passingScore: number; timeLimit?: number;
  questions: Question[];
  module: { title: string; course: { id: string; title: string } };
}

type Phase = "intro" | "quiz" | "result";

export default function QuizPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/quiz/${id}`)
      .then((r) => r.json())
      .then((data) => { setQuiz(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (phase !== "quiz" || !quiz?.timeLimit) return;
    setTimeLeft(quiz.timeLimit * 60);
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null || t <= 1) { clearInterval(interval); handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function handleSubmit() {
    if (!quiz || submitting) return;
    setSubmitting(true);

    const res = await fetch(`/api/quiz/${id}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });

    if (res.ok) {
      const data = await res.json();
      setResult(data);
      setPhase("result");
    }
    setSubmitting(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-[#1E3A5F]" />
    </div>
  );

  if (!quiz) return (
    <div className="text-center py-12 text-gray-500">Quiz introuvable.</div>
  );

  const question = quiz.questions[currentQ];
  const totalQ = quiz.questions.length;
  const progressPct = totalQ > 0 ? Math.round(((currentQ + 1) / totalQ) * 100) : 0;

  // ── INTRO ──
  if (phase === "intro") return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📝</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
        <p className="text-sm text-gray-500 mb-6">{quiz.module.course.title} › {quiz.module.title}</p>

        <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-[#1E3A5F]">{totalQ}</p>
            <p className="text-gray-500 text-xs mt-0.5">Questions</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-[#1E3A5F]">{quiz.passingScore}%</p>
            <p className="text-gray-500 text-xs mt-0.5">Score requis</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-[#1E3A5F]">{quiz.timeLimit ?? "∞"}</p>
            <p className="text-gray-500 text-xs mt-0.5">{quiz.timeLimit ? "minutes" : "Illimité"}</p>
          </div>
        </div>

        <button
          onClick={() => setPhase("quiz")}
          className="w-full bg-[#1E3A5F] text-white py-3 rounded-xl font-semibold text-base hover:bg-[#0D1B2A] transition-colors"
        >
          Commencer le quiz
        </button>
      </div>
      <div className="text-center">
        <Link href="/quiz" className="text-sm text-gray-500 hover:underline">← Retour aux quiz</Link>
      </div>
    </div>
  );

  // ── RESULT ──
  if (phase === "result" && result) return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${result.passed ? "bg-green-100" : "bg-red-100"}`}>
          {result.passed
            ? <CheckCircle className="w-10 h-10 text-green-600" />
            : <XCircle className="w-10 h-10 text-red-600" />}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          {result.passed ? "Félicitations !" : "Quiz non validé"}
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          {result.passed
            ? "Vous avez validé ce quiz avec succès."
            : `Score minimum requis : ${quiz.passingScore}%. Réessayez pour progresser.`}
        </p>

        <div className={`text-4xl font-bold mb-2 ${result.passed ? "text-green-600" : "text-red-600"}`}>
          {Math.round(result.score)}%
        </div>
        <p className="text-sm text-gray-500 mb-8">Score obtenu</p>

        <div className="flex gap-3">
          <button
            onClick={() => { setPhase("intro"); setAnswers({}); setCurrentQ(0); }}
            className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Réessayer
          </button>
          <Link
            href={`/training/${quiz.module.course.id}`}
            className="flex-1 bg-[#1E3A5F] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors text-center"
          >
            Retour à la formation
          </Link>
        </div>
      </div>
    </div>
  );

  // ── QUIZ ──
  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Question {currentQ + 1} / {totalQ}</span>
          {timeLeft !== null && (
            <span className={`flex items-center gap-1 text-sm font-medium ${timeLeft < 60 ? "text-red-600" : "text-gray-600"}`}>
              <Clock className="w-4 h-4" />
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
            </span>
          )}
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="bg-[#1E3A5F] h-2 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <p className="text-base font-semibold text-gray-900 mb-5 leading-relaxed">{question.text}</p>

        <div className="space-y-3">
          {question.answers.sort((a, b) => a.order - b.order).map((answer) => {
            const selected = answers[question.id] === answer.id;
            return (
              <button
                key={answer.id}
                onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: answer.id }))}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                  selected
                    ? "border-[#1E3A5F] bg-blue-50 text-[#1E3A5F] font-medium"
                    : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {answer.text}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {currentQ > 0 && (
          <button
            onClick={() => setCurrentQ((q) => q - 1)}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>
        )}
        <div className="flex-1" />
        {currentQ < totalQ - 1 ? (
          <button
            onClick={() => setCurrentQ((q) => q + 1)}
            disabled={!answers[question.id]}
            className="flex items-center gap-1.5 bg-[#1E3A5F] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0D1B2A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || !answers[question.id]}
            className="flex items-center gap-1.5 bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</> : "Terminer le quiz"}
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

interface Question { question: string; focus: string; tip: string; }
interface Evaluation {
  score: number;
  verdict: string;
  strengths: string[];
  improvements: string[];
  improved_answer: string;
}
interface AnswerRecord { question: Question; answer: string; evaluation: Evaluation; }

type Stage = "setup" | "loading" | "interview" | "summary";

export default function InterviewPage() {
  const [stage, setStage] = useState<Stage>("setup");
  const [form, setForm] = useState({ job_title: "", company: "", description: "", interview_type: "mixta" });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [error, setError] = useState("");
  const [showTip, setShowTip] = useState(false);

  async function startInterview(e: React.FormEvent) {
    e.preventDefault();
    if (!form.job_title) return;
    setError("");
    setStage("loading");
    try {
      const res = await fetch("/api/interview/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.questions?.length) throw new Error(data.error ?? "Error");
      setQuestions(data.questions);
      setCurrent(0);
      setRecords([]);
      setStage("interview");
    } catch {
      setError("No se pudieron generar las preguntas. Intenta de nuevo.");
      setStage("setup");
    }
  }

  async function submitAnswer() {
    if (!answer.trim() || evaluating) return;
    setEvaluating(true);
    try {
      const q = questions[current];
      const res = await fetch("/api/interview/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_title: form.job_title, question: q.question, answer, focus: q.focus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setEvaluation(data);
      setRecords((prev) => [...prev, { question: q, answer, evaluation: data }]);
    } catch {
      setError("No se pudo evaluar. Intenta de nuevo.");
    }
    setEvaluating(false);
  }

  function nextQuestion() {
    setEvaluation(null);
    setAnswer("");
    setShowTip(false);
    setError("");
    if (current + 1 >= questions.length) {
      setStage("summary");
    } else {
      setCurrent(current + 1);
    }
  }

  function restart() {
    setStage("setup");
    setQuestions([]);
    setRecords([]);
    setCurrent(0);
    setAnswer("");
    setEvaluation(null);
    setError("");
  }

  const avgScore = records.length
    ? Math.round(records.reduce((s, r) => s + r.evaluation.score, 0) / records.length)
    : 0;

  const scoreColor = (s: number) => s >= 70 ? "text-emerald-400" : s >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Simulador de entrevista</h1>
        <p className="text-white/40 text-sm mt-1">
          Practica con preguntas reales del puesto, recibe feedback inmediato y mejora antes de la entrevista de verdad.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-6">{error}</div>
      )}

      {/* ── Setup ── */}
      {stage === "setup" && (
        <form onSubmit={startInterview} className="max-w-2xl">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-2">
                  Puesto <span className="text-violet-400">*</span>
                </label>
                <input
                  value={form.job_title}
                  onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                  placeholder="Ej. QA Engineer Senior"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-violet-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-2">Empresa</label>
                <input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Ej. Softtek"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-violet-500/50 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-2">Descripción de la vacante (opcional, mejora las preguntas)</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Pega aquí la descripción de la vacante..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-violet-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-2">Tipo de entrevista</label>
              <div className="flex gap-2 flex-wrap">
                {["mixta", "técnica", "comportamental", "con RH", "con el director"].map((t) => (
                  <button
                    key={t} type="button"
                    onClick={() => setForm({ ...form, interview_type: t })}
                    className={`text-xs px-3.5 py-2 rounded-xl border capitalize transition-all ${
                      form.interview_type === t ? "bg-violet-600/20 border-violet-500/40 text-violet-300" : "border-white/10 text-white/40 hover:text-white/70"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={!form.job_title}
            className="mt-5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-6 py-3 rounded-xl transition-all disabled:opacity-40"
          >
            Comenzar simulacro →
          </button>
        </form>
      )}

      {/* ── Generando preguntas ── */}
      {stage === "loading" && (
        <div className="text-center py-24">
          <svg className="w-10 h-10 text-violet-400 animate-spin mx-auto mb-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-white/60 font-medium">El entrevistador está preparando tus preguntas...</p>
          <p className="text-white/30 text-sm mt-1">Basadas en tu CV y el puesto de {form.job_title}</p>
        </div>
      )}

      {/* ── Entrevista ── */}
      {stage === "interview" && questions[current] && (
        <div className="max-w-3xl">
          {/* Progreso */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${((current + (evaluation ? 1 : 0)) / questions.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-white/40 shrink-0">Pregunta {current + 1} de {questions.length}</span>
          </div>

          {/* Pregunta */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0 text-lg">🎤</div>
              <div className="flex-1">
                <p className="text-white font-medium leading-relaxed">{questions[current].question}</p>
                <p className="text-xs text-white/35 mt-2">Evalúa: {questions[current].focus}</p>
                {!evaluation && (
                  <button
                    onClick={() => setShowTip(!showTip)}
                    className="text-xs text-violet-400/70 hover:text-violet-300 mt-2 transition-colors"
                  >
                    {showTip ? "Ocultar pista" : "💡 Ver pista"}
                  </button>
                )}
                {showTip && !evaluation && (
                  <p className="text-xs text-violet-300/80 mt-2 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">{questions[current].tip}</p>
                )}
              </div>
            </div>
          </div>

          {/* Respuesta */}
          {!evaluation ? (
            <div>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={6}
                placeholder="Escribe tu respuesta como la dirías en voz alta. Sé específico: situación, qué hiciste tú, resultado..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-white/25 focus:border-violet-500/50 focus:outline-none leading-relaxed"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={submitAnswer}
                  disabled={!answer.trim() || evaluating}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-6 py-3 rounded-xl transition-all disabled:opacity-40"
                >
                  {evaluating ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Evaluando...
                    </>
                  ) : "Enviar respuesta"}
                </button>
              </div>
            </div>
          ) : (
            /* Feedback */
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-white/70">Evaluación</p>
                  <span className={`text-3xl font-bold ${scoreColor(evaluation.score)}`}>{evaluation.score}<span className="text-sm text-white/30">/100</span></span>
                </div>
                <p className="text-sm text-white/80 mb-4">{evaluation.verdict}</p>
                {evaluation.strengths.length > 0 && (
                  <div className="mb-3">
                    {evaluation.strengths.map((s, i) => (
                      <p key={i} className="text-sm text-emerald-400/90 flex gap-2 mb-1.5"><span>✓</span>{s}</p>
                    ))}
                  </div>
                )}
                {evaluation.improvements.length > 0 && (
                  <div className="mb-4">
                    {evaluation.improvements.map((s, i) => (
                      <p key={i} className="text-sm text-amber-400/90 flex gap-2 mb-1.5"><span>↗</span>{s}</p>
                    ))}
                  </div>
                )}
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
                  <p className="text-xs font-medium text-violet-300 mb-2">💎 Así sonaría tu respuesta mejorada:</p>
                  <p className="text-sm text-white/75 leading-relaxed">{evaluation.improved_answer}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={nextQuestion}
                  className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-6 py-3 rounded-xl transition-all"
                >
                  {current + 1 >= questions.length ? "Ver mi resumen final →" : "Siguiente pregunta →"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Resumen final ── */}
      {stage === "summary" && (
        <div className="max-w-3xl">
          <div className="bg-gradient-to-br from-violet-600/15 to-transparent border border-violet-500/25 rounded-2xl p-8 text-center mb-6">
            <p className="text-sm text-white/50 mb-2">Tu desempeño general</p>
            <p className={`text-6xl font-bold ${scoreColor(avgScore)}`}>{avgScore}<span className="text-xl text-white/30">/100</span></p>
            <p className="text-sm text-white/60 mt-3">
              {avgScore >= 70 ? "¡Excelente! Estás listo para la entrevista real." : avgScore >= 50 ? "Buen avance — repasa las respuestas mejoradas y vuelve a practicar." : "Sigue practicando: revisa cada respuesta mejorada y repite el simulacro."}
            </p>
          </div>

          <div className="space-y-3 mb-8">
            {records.map((r, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                <p className="text-sm text-white/70 flex-1 line-clamp-1">{i + 1}. {r.question.question}</p>
                <span className={`text-lg font-bold shrink-0 ${scoreColor(r.evaluation.score)}`}>{r.evaluation.score}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={restart}
              className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-6 py-3 rounded-xl transition-all"
            >
              Practicar otra entrevista
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

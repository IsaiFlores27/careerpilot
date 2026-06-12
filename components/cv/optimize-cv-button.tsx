"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  { label: "Leyendo tu CV...", pct: 10 },
  { label: "Identificando bullets débiles...", pct: 25 },
  { label: "Reescribiendo con método STAR...", pct: 45 },
  { label: "Añadiendo keywords ATS...", pct: 65 },
  { label: "Cuantificando logros...", pct: 80 },
  { label: "Generando versión optimizada...", pct: 92 },
];

export function OptimizeCvButton({ resumeId }: { resumeId: string }) {
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [pct, setPct] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!loading) { setStepIdx(0); setPct(0); return; }
    let i = 0;
    const tick = () => {
      if (i >= STEPS.length) return;
      setStepIdx(i);
      setPct(STEPS[i].pct);
      i++;
    };
    tick();
    const id = setInterval(tick, 3500);
    return () => clearInterval(id);
  }, [loading]);

  async function handleOptimize() {
    setLoading(true);
    const res = await fetch("/api/cv/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_id: resumeId }),
    });

    if (res.ok) {
      setPct(100);
      const data = await res.json();
      setTimeout(() => router.push(`/cv/${data.optimized_resume_id}`), 400);
    } else {
      alert("Error al optimizar el CV. Intenta de nuevo.");
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
        <div className="bg-[#1a1d2e] border border-white/10 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
          {/* Icono animado */}
          <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-6">
            <svg className="w-7 h-7 text-violet-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>

          <h3 className="text-white font-semibold text-center mb-1">Optimizando tu CV</h3>
          <p className="text-white/40 text-xs text-center mb-6">La IA está reescribiendo tu CV para máxima visibilidad ATS</p>

          {/* Paso actual */}
          <p className="text-violet-300 text-sm text-center mb-4 min-h-[20px] transition-all">
            {STEPS[stepIdx]?.label}
          </p>

          {/* Barra de progreso */}
          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-white/25">Puede tomar ~30 segundos</span>
            <span className="text-xs text-violet-400">{pct}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleOptimize}
      className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2.5 rounded-xl transition-all font-medium"
    >
      Optimizar para ATS
    </button>
  );
}

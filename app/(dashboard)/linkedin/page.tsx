"use client";

import { useState } from "react";

interface LinkedInResult {
  headline: string;
  about: string;
  featured_skills: string[];
  experiences: Array<{ role: string; company: string; description: string }>;
  keywords_used: string[];
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className={`text-xs px-3 py-1 rounded-lg border transition-all ${
        copied
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          : "bg-white/5 border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
      }`}
    >
      {copied ? "✓ Copiado" : `Copiar ${label}`}
    </button>
  );
}

export default function LinkedInPage() {
  const [result, setResult] = useState<LinkedInResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleOptimize() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/linkedin/optimize", { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al optimizar");
      setLoading(false);
      return;
    }
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Optimizar LinkedIn</h1>
        <p className="text-white/40 text-sm mt-1">
          Titular, Acerca de y aptitudes optimizados para reclutadores de tu industria.
        </p>
      </div>

      {!result ? (
        <div className="max-w-lg">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="font-semibold text-white mb-2">Perfil listo para reclutadores</h2>
            <p className="text-sm text-white/40 mb-8 max-w-xs mx-auto">
              Usamos tu CV como base para crear un perfil de LinkedIn que aparezca en búsquedas de tu industria.
            </p>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <button
              onClick={handleOptimize}
              disabled={loading}
              className="bg-violet-600 hover:bg-violet-500 text-white px-8 py-3 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generando perfil...
                </>
              ) : (
                "Generar perfil optimizado"
              )}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: "Titular", desc: "Visible en búsquedas" },
              { label: "Acerca de", desc: "Con keywords de tu industria" },
              { label: "Aptitudes", desc: "Top skills para reclutadores" },
            ].map((item) => (
              <div key={item.label} className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                <p className="text-xs font-medium text-white/60">{item.label}</p>
                <p className="text-xs text-white/25 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-2xl space-y-4">
          {/* Titular */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white/70">Titular</h2>
              <CopyButton text={result.headline} label="titular" />
            </div>
            <p className="text-white font-medium">{result.headline}</p>
          </div>

          {/* Acerca de */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white/70">Acerca de</h2>
              <CopyButton text={result.about} label="texto" />
            </div>
            <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{result.about}</p>
          </div>

          {/* Aptitudes */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white/70 mb-3">Aptitudes destacadas</h2>
            <div className="flex flex-wrap gap-2">
              {result.featured_skills.map((skill, i) => (
                <span key={i} className="bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs px-3 py-1.5 rounded-xl">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-5 py-4">
            <p className="text-xs font-semibold text-emerald-400 mb-2">
              {result.keywords_used.length} keywords incluidas
            </p>
            <p className="text-xs text-emerald-400/60 leading-relaxed">
              {result.keywords_used.join("  ·  ")}
            </p>
          </div>

          <button
            onClick={() => setResult(null)}
            className="text-sm text-white/30 hover:text-white/60 transition-colors"
          >
            Regenerar perfil
          </button>
        </div>
      )}
    </div>
  );
}

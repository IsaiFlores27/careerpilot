"use client";

import { useState } from "react";

interface LinkedInResult {
  headline: string;
  about: string;
  featured_skills: string[];
  experiences: Array<{ role: string; company: string; description: string }>;
  keywords_used: string[];
}

export default function LinkedInPage() {
  const [result, setResult] = useState<LinkedInResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

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

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Optimizar LinkedIn</h1>
      <p className="text-gray-500 text-sm mb-6">
        Generamos tu titular, Acerca de, aptitudes y las 3 mejores experiencias optimizadas para reclutadores.
      </p>

      {!result ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-5xl mb-4">💼</p>
          <p className="font-medium text-gray-700 mb-2">
            Optimiza tu perfil de LinkedIn con IA
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Usando tu CV como base, creamos un perfil descubrible para reclutadores
            de tu industria.
          </p>
          {error && (
            <p className="text-red-600 text-sm mb-4">{error}</p>
          )}
          <button
            onClick={handleOptimize}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Generando perfil..." : "Generar perfil optimizado"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Titular */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm text-gray-700">Titular</h2>
              <button
                onClick={() => copy(result.headline, "headline")}
                className="text-xs text-blue-600 hover:underline"
              >
                {copied === "headline" ? "✓ Copiado" : "Copiar"}
              </button>
            </div>
            <p className="text-gray-900">{result.headline}</p>
          </div>

          {/* Acerca de */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm text-gray-700">Acerca de</h2>
              <button
                onClick={() => copy(result.about, "about")}
                className="text-xs text-blue-600 hover:underline"
              >
                {copied === "about" ? "✓ Copiado" : "Copiar"}
              </button>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.about}</p>
          </div>

          {/* Aptitudes */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-sm text-gray-700 mb-3">Aptitudes destacadas</h2>
            <div className="flex flex-wrap gap-2">
              {result.featured_skills.map((skill, i) => (
                <span key={i} className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Keywords usadas */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-green-700 mb-2">
              Keywords incluidas ({result.keywords_used.length})
            </p>
            <p className="text-xs text-green-600">
              {result.keywords_used.join(", ")}
            </p>
          </div>

          <button
            onClick={() => setResult(null)}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Regenerar
          </button>
        </div>
      )}
    </div>
  );
}

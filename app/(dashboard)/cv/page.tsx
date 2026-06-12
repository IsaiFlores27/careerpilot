"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CvPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const router = useRouter();

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch("/api/cv/upload", { method: "POST", body: formData });
    if (!uploadRes.ok) {
      const data = await uploadRes.json();
      setError(data.error ?? "Error al subir el archivo");
      setUploading(false);
      return;
    }

    const { resume_id } = await uploadRes.json();
    setUploading(false);
    setAnalyzing(true);

    const analyzeRes = await fetch("/api/cv/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_id }),
    });

    if (!analyzeRes.ok) {
      const data = await analyzeRes.json();
      setError(data.error ?? "Error al analizar el CV");
      setAnalyzing(false);
      return;
    }

    router.push(`/cv/${resume_id}`);
  }

  const isLoading = uploading || analyzing;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Mi CV</h1>
        <p className="text-white/40 text-sm mt-1">Sube tu CV en PDF o Word. Lo analizamos con IA y obtienes un diagnóstico ATS completo.</p>
      </div>

      <div className="max-w-xl">
        <form onSubmit={handleUpload}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
            </div>
          )}

          {/* Drop zone */}
          <div
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-violet-500 bg-violet-500/10"
                : file
                ? "border-violet-500/50 bg-violet-500/5"
                : "border-white/10 hover:border-white/20 hover:bg-white/5"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const dropped = e.dataTransfer.files[0];
              if (dropped) setFile(dropped);
            }}
            onClick={() => document.getElementById("cv-input")?.click()}
          >
            <input
              id="cv-input"
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            {file ? (
              <div>
                <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="font-semibold text-white">{file.name}</p>
                <p className="text-xs text-white/40 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="text-xs text-white/30 hover:text-white/60 mt-3 transition-colors"
                >
                  Cambiar archivo
                </button>
              </div>
            ) : (
              <div>
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-7 h-7 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="font-medium text-white/70">Arrastra tu CV aquí</p>
                <p className="text-sm text-white/30 mt-1">o haz clic para seleccionar</p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <span className="bg-white/5 border border-white/10 text-xs text-white/40 px-3 py-1 rounded-full">PDF</span>
                  <span className="bg-white/5 border border-white/10 text-xs text-white/40 px-3 py-1 rounded-full">Word</span>
                  <span className="bg-white/5 border border-white/10 text-xs text-white/40 px-3 py-1 rounded-full">máx. 10 MB</span>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!file || isLoading}
            className="w-full mt-4 bg-violet-600 hover:bg-violet-500 text-white py-3.5 rounded-xl font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Subiendo...
              </>
            ) : analyzing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analizando con IA...
              </>
            ) : (
              "Analizar CV"
            )}
          </button>
        </form>

        {analyzing && (
          <div className="mt-4 bg-violet-500/5 border border-violet-500/20 rounded-xl px-5 py-4">
            <p className="text-sm text-violet-300 font-medium">La IA está procesando tu CV</p>
            <p className="text-xs text-white/40 mt-1">Extrayendo perfil, calculando ATS Score y detectando mejoras. Puede tomar ~20 segundos.</p>
          </div>
        )}

        {/* Qué obtienes */}
        {!file && (
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { icon: "🎯", title: "ATS Score", desc: "Compatibilidad con filtros automáticos" },
              { icon: "🔍", title: "Diagnóstico", desc: "Bullets débiles y puntos ciegos" },
              { icon: "⚡", title: "Optimización", desc: "Reescritura lista en segundos" },
            ].map((item) => (
              <div key={item.title} className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
                <span className="text-xl">{item.icon}</span>
                <p className="text-xs font-medium text-white/70 mt-2">{item.title}</p>
                <p className="text-xs text-white/30 mt-0.5 leading-tight">{item.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

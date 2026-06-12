"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ANALYZE_STEPS = [
  { label: "Leyendo el documento...", pct: 15 },
  { label: "Extrayendo perfil y experiencia...", pct: 35 },
  { label: "Identificando habilidades y keywords...", pct: 55 },
  { label: "Calculando ATS Score...", pct: 72 },
  { label: "Detectando bullets débiles...", pct: 88 },
  { label: "Generando diagnóstico...", pct: 96 },
];

interface ResumeRow {
  id: string;
  kind: string;
  ats_score: number | null;
  original_filename: string | null;
  created_at: string;
  structured: { contact?: { name?: string } } | null;
}

export default function CvPage() {
  const [resumes, setResumes]       = useState<ResumeRow[]>([]);
  const [activeId, setActiveId]     = useState<string | null>(null);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [showUploader, setShowUploader]     = useState(false);
  const [actionLoading, setActionLoading]   = useState<string | null>(null); // resume id being acted on
  const [deleteConfirm, setDeleteConfirm]   = useState<string | null>(null); // id pending confirmation
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  const [file, setFile]             = useState<File | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [analyzing, setAnalyzing]   = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [analyzePct, setAnalyzePct]   = useState(0);
  const [error, setError]           = useState("");
  const [dragOver, setDragOver]     = useState(false);
  const router = useRouter();

  const loadResumes = () => {
    fetch("/api/cv/list")
      .then((r) => r.json())
      .then((data) => {
        setResumes(data.resumes ?? []);
        setActiveId(data.active_resume_id ?? null);
        setLoadingResumes(false);
      })
      .catch(() => setLoadingResumes(false));
  };

  useEffect(() => { loadResumes(); }, []);

  useEffect(() => {
    if (!analyzing) { setAnalyzeStep(0); setAnalyzePct(0); return; }
    let i = 0;
    const tick = () => {
      if (i >= ANALYZE_STEPS.length) return;
      setAnalyzeStep(i); setAnalyzePct(ANALYZE_STEPS[i].pct); i++;
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, [analyzing]);

  async function handleSetActive(resumeId: string) {
    setActionLoading(resumeId);
    const res = await fetch("/api/cv/set-active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_id: resumeId }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.sql) setMigrationNeeded(true);
    } else {
      setActiveId(resumeId);
    }
    setActionLoading(null);
  }

  async function handleDelete(resumeId: string) {
    setActionLoading(resumeId);
    const res = await fetch(`/api/cv/delete?resume_id=${resumeId}`, { method: "DELETE" });
    if (res.ok) {
      setResumes((prev) => prev.filter((r) => r.id !== resumeId));
      if (activeId === resumeId) setActiveId(null);
    }
    setDeleteConfirm(null);
    setActionLoading(null);
  }

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

  const scoreColor = (s: number) =>
    s >= 70 ? "text-emerald-400" : s >= 50 ? "text-amber-400" : "text-red-400";
  const scoreBg = (s: number) =>
    s >= 70 ? "border-emerald-500/20 bg-emerald-500/5" : s >= 50 ? "border-amber-500/20 bg-amber-500/5" : "border-red-500/20 bg-red-500/5";
  const scoreLabel = (s: number) =>
    s >= 70 ? "Excelente" : s >= 50 ? "Mejorable" : "Crítico";

  const kindLabel: Record<string, string> = {
    original:  "Original",
    optimized: "Optimizado",
    tailored:  "Personalizado",
  };

  if (loadingResumes) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Mi CV</h1>
          <p className="text-white/40 text-sm mt-1">Sube tu CV en PDF o Word. Lo analizamos con IA y obtienes un diagnóstico ATS completo.</p>
        </div>
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div>
      {/* Migration notice */}
      {migrationNeeded && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
          <p className="text-amber-400 text-sm font-medium mb-1">Migración de base de datos requerida</p>
          <p className="text-amber-300/70 text-xs mb-3">Para habilitar el CV activo, ejecuta este SQL en el <a href="https://supabase.com/dashboard/project/ocaucunufzugvtkbiltr/sql/new" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-300">Supabase SQL Editor</a>:</p>
          <code className="block bg-black/40 rounded-lg p-3 text-xs text-green-400 font-mono select-all">
            ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_resume_id uuid REFERENCES resumes(id) ON DELETE SET NULL;
          </code>
        </div>
      )}

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mi CV</h1>
          <p className="text-white/40 text-sm mt-1">Sube tu CV en PDF o Word. Lo analizamos con IA y obtienes un diagnóstico ATS completo.</p>
        </div>
        {resumes.length > 0 && (
          <button
            onClick={() => setShowUploader(!showUploader)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2.5 rounded-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo CV
          </button>
        )}
      </div>

      {/* Uploader */}
      {(resumes.length === 0 || showUploader) && (
        <div className="max-w-xl mb-8">
          <form onSubmit={handleUpload}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-6">{error}</div>
            )}
            <div
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                dragOver ? "border-violet-500 bg-violet-500/10"
                  : file  ? "border-violet-500/50 bg-violet-500/5"
                          : "border-white/10 hover:border-white/20 hover:bg-white/5"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const d = e.dataTransfer.files[0]; if (d) setFile(d); }}
              onClick={() => document.getElementById("cv-input")?.click()}
            >
              <input id="cv-input" type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              {file ? (
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-white">{file.name}</p>
                  <p className="text-xs text-white/40 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-xs text-white/30 hover:text-white/60 mt-3 transition-colors">Cambiar archivo</button>
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
              type="submit" disabled={!file || isLoading}
              className="w-full mt-4 bg-violet-600 hover:bg-violet-500 text-white py-3.5 rounded-xl font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? <><SpinIcon />Subiendo...</> : analyzing ? <><SpinIcon />Analizando con IA...</> : "Analizar CV"}
            </button>
          </form>
        </div>
      )}

      {/* CV list */}
      {resumes.length > 0 && (
        <div className="space-y-3">
          {activeId && (
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              <p className="text-xs text-violet-400 font-medium">El CV activo se usa en Vacantes, LinkedIn y Coach IA</p>
            </div>
          )}
          <p className="text-xs text-white/30 uppercase tracking-wider font-medium mb-4">
            {resumes.length} CV{resumes.length > 1 ? "s" : ""} guardado{resumes.length > 1 ? "s" : ""}
          </p>

          {resumes.map((r) => {
            const score   = r.ats_score ?? 0;
            const isActive = r.id === activeId;
            const isActing = actionLoading === r.id;
            const isConfirming = deleteConfirm === r.id;

            return (
              <div
                key={r.id}
                className={`border rounded-2xl transition-all ${
                  isActive
                    ? "border-violet-500/40 bg-violet-500/8 ring-1 ring-violet-500/20"
                    : `${scoreBg(score)} hover:bg-white/5`
                }`}
              >
                {/* Main row — clickable to detail */}
                <Link href={`/cv/${r.id}`} className="flex items-center justify-between px-5 py-4 group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      {isActive ? (
                        <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white text-sm">
                          {r.structured?.contact?.name ?? r.original_filename ?? "CV sin nombre"}
                        </p>
                        {isActive && (
                          <span className="text-xs bg-violet-600/25 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-medium">
                            Activo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-white/30">{kindLabel[r.kind] ?? r.kind}</span>
                        <span className="text-white/15">·</span>
                        <span className="text-xs text-white/30">
                          {new Date(r.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {r.ats_score !== null && (
                      <div className="text-right">
                        <span className={`text-2xl font-bold ${scoreColor(score)}`}>{score}</span>
                        <span className="text-white/30 text-xs">/100</span>
                        <p className={`text-xs ${scoreColor(score)} opacity-70`}>{scoreLabel(score)}</p>
                      </div>
                    )}
                    <svg className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>

                {/* Action bar */}
                <div className="px-5 pb-3 flex items-center gap-2 border-t border-white/5 pt-3">
                  {!isActive && (
                    <button
                      onClick={() => handleSetActive(r.id)}
                      disabled={isActing}
                      className="flex items-center gap-1.5 text-xs bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                    >
                      {isActing ? <SpinIcon size="3" /> : (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      Usar como activo
                    </button>
                  )}
                  {isActive && (
                    <span className="flex items-center gap-1.5 text-xs text-violet-400/70 px-3 py-1.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Usado por Vacantes, LinkedIn y Coach
                    </span>
                  )}

                  <div className="ml-auto">
                    {isConfirming ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40">¿Eliminar?</span>
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={isActing}
                          className="text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-lg transition-all"
                        >
                          Sí, eliminar
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-xs text-white/30 hover:text-white/60 px-2 py-1 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(r.id)}
                        className="flex items-center gap-1.5 text-xs text-white/25 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-500/10"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Analyzing modal */}
      {analyzing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#1a1d2e] border border-white/10 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-6">
              <svg className="w-7 h-7 text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-center mb-1">Analizando tu CV</h3>
            <p className="text-white/40 text-xs text-center mb-6">La IA está procesando tu documento</p>
            <p className="text-violet-300 text-sm text-center mb-4 min-h-[20px]">{ANALYZE_STEPS[analyzeStep]?.label}</p>
            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${analyzePct}%` }} />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-white/25">~20 segundos</span>
              <span className="text-xs text-violet-400">{analyzePct}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SpinIcon({ size = "4" }: { size?: string }) {
  return (
    <svg className={`w-${size} h-${size} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

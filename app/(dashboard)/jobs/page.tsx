"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Job {
  id: string | null;
  external_id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  description?: string;
  salary_min?: number;
  salary_max?: number;
  posted_at?: string;
  source: string;
  match_status: string;
  match_score?: number | null;
  applied: boolean;
}

const TAILOR_STEPS = [
  "Leyendo la vacante...",
  "Detectando keywords del puesto...",
  "Reordenando tu experiencia...",
  "Inyectando keywords en tus bullets...",
  "Ajustando headline y resumen...",
  "Calculando cobertura de keywords...",
];

// Las vacantes generadas por IA (source=manual) no tienen URL real:
// enlazamos a una búsqueda real de Google con el puesto + empresa.
function jobLink(job: Job): string {
  if (job.source === "manual" || !job.url) {
    return `https://www.google.com/search?q=${encodeURIComponent(`"${job.title}" ${job.company} vacante empleo`)}`;
  }
  return job.url;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tab, setTab] = useState<"suggested" | "saved">("suggested");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);   // job en acción
  const [tailoring, setTailoring] = useState<Job | null>(null);    // job en proceso de tailor
  const [tailorStep, setTailorStep] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/jobs/saved")
      .then((r) => r.json())
      .then((data) => { if (data.jobs?.length > 0) setJobs(data.jobs); })
      .catch(() => {})
      .finally(() => setInitialLoading(false));

    // CV activo para "Adaptar CV"
    fetch("/api/cv/list")
      .then((r) => r.json())
      .then((data) => {
        const id = data.active_resume_id ?? data.resumes?.[0]?.id ?? null;
        setActiveResumeId(id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!tailoring) { setTailorStep(0); return; }
    let i = 0;
    const id = setInterval(() => {
      i = Math.min(i + 1, TAILOR_STEPS.length - 1);
      setTailorStep(i);
    }, 3500);
    return () => clearInterval(id);
  }, [tailoring]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  async function handleSearch() {
    setLoading(true);
    const res = await fetch("/api/jobs/search", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      // Conservar las guardadas que ya teníamos y agregar las nuevas sugeridas
      const savedJobs = jobs.filter((j) => j.match_status === "saved");
      const savedIds = new Set(savedJobs.map((j) => j.external_id));
      const fresh = (data.jobs ?? []).filter((j: Job) => !savedIds.has(j.external_id));
      setJobs([...fresh, ...savedJobs]);
      setTab("suggested");
    }
    setLoading(false);
  }

  async function setMatchStatus(job: Job, status: "saved" | "dismissed" | "suggested") {
    if (!job.id) return;
    setActionId(job.external_id);
    const res = await fetch("/api/jobs/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: job.id, status }),
    });
    if (res.ok) {
      if (status === "dismissed") {
        setJobs((prev) => prev.filter((j) => j.external_id !== job.external_id));
        setToast("Vacante descartada");
      } else {
        setJobs((prev) => prev.map((j) => j.external_id === job.external_id ? { ...j, match_status: status } : j));
        setToast(status === "saved" ? "Vacante guardada ⭐" : "Devuelta a sugeridas");
      }
    }
    setActionId(null);
  }

  async function handleApplied(job: Job) {
    if (!job.id) return;
    setActionId(job.external_id);
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: job.id, resume_id: activeResumeId }),
    });
    if (res.ok || res.status === 409) {
      setJobs((prev) => prev.map((j) => j.external_id === job.external_id ? { ...j, applied: true, match_status: "saved" } : j));
      setToast(res.status === 409 ? "Ya estaba en tu pipeline" : "Agregada a tu pipeline ✓ Te recordaremos el seguimiento en 5 días");
    }
    setActionId(null);
  }

  async function handleTailor(job: Job) {
    if (!activeResumeId) {
      setToast("Primero sube y analiza un CV");
      return;
    }
    if (!job.description) {
      setToast("Esta vacante no tiene descripción para adaptar el CV");
      return;
    }
    setTailoring(job);
    try {
      const res = await fetch("/api/cv/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_id: activeResumeId,
          job_id: job.id,
          job_title: job.title,
          company: job.company,
          description: job.description,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/cv/${data.tailored_resume_id}`);
        return;
      }
      const err = await res.json().catch(() => ({}));
      setToast(err.error ?? "Error al adaptar el CV");
    } catch {
      setToast("Error al adaptar el CV");
    }
    setTailoring(null);
  }

  const visible = jobs.filter((j) => tab === "saved" ? j.match_status === "saved" : j.match_status === "suggested");
  const savedCount = jobs.filter((j) => j.match_status === "saved").length;
  const suggestedCount = jobs.filter((j) => j.match_status === "suggested").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Vacantes para ti</h1>
          <p className="text-white/40 text-sm mt-1">Basadas en tu CV activo · guarda, descarta o postúlate</p>
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><SpinIcon /> Buscando...</>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {jobs.length > 0 ? "Buscar más" : "Buscar ahora"}
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      {jobs.length > 0 && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("suggested")}
            className={`text-sm px-4 py-2 rounded-xl border transition-all ${
              tab === "suggested" ? "bg-violet-600/20 border-violet-500/40 text-violet-300" : "border-white/10 text-white/40 hover:text-white/70"
            }`}
          >
            Sugeridas ({suggestedCount})
          </button>
          <button
            onClick={() => setTab("saved")}
            className={`text-sm px-4 py-2 rounded-xl border transition-all ${
              tab === "saved" ? "bg-amber-500/15 border-amber-500/40 text-amber-300" : "border-white/10 text-white/40 hover:text-white/70"
            }`}
          >
            ⭐ Guardadas ({savedCount})
          </button>
        </div>
      )}

      {initialLoading && (
        <div className="text-center py-20"><span className="text-xs text-white/25">Cargando vacantes guardadas...</span></div>
      )}

      {!initialLoading && !loading && visible.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-white/40 font-medium">{tab === "saved" ? "Sin vacantes guardadas" : 'Haz clic en "Buscar ahora"'}</p>
          <p className="text-white/25 text-sm mt-1">{tab === "saved" ? "Guarda vacantes con la estrella para verlas aquí" : "Encontraremos vacantes que encajan con tu perfil"}</p>
        </div>
      )}

      {/* Lista */}
      {visible.length > 0 && !initialLoading && (
        <div className="space-y-3">
          {visible.map((job) => {
            const isActing = actionId === job.external_id;
            const isAI = job.source === "manual";
            return (
              <div
                key={job.external_id}
                className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:border-white/10 hover:bg-white/[0.07] transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white">{job.title}</h3>
                      {job.remote && (
                        <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/20">Remoto</span>
                      )}
                      {job.applied && (
                        <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-0.5 rounded-full border border-blue-500/20">✓ Postulado</span>
                      )}
                      {isAI && (
                        <span className="bg-white/5 text-white/35 text-xs px-2 py-0.5 rounded-full border border-white/10" title="Vacante sugerida por IA basada en el mercado. El enlace abre una búsqueda real en Google.">
                          Sugerencia IA
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/60 mt-0.5">{job.company}</p>
                    {job.description && (
                      <p className="text-xs text-white/35 mt-1.5 line-clamp-2">{job.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                      {job.location && (
                        <span className="flex items-center gap-1.5 text-xs text-white/35">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {job.location}
                        </span>
                      )}
                      {(job.salary_min || job.salary_max) && (
                        <span className="text-xs text-emerald-400/70">
                          {job.salary_min ? `$${job.salary_min.toLocaleString()}` : ""}
                          {job.salary_min && job.salary_max ? " – " : ""}
                          {job.salary_max ? `$${job.salary_max.toLocaleString()}` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones secundarias (derecha) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setMatchStatus(job, job.match_status === "saved" ? "suggested" : "saved")}
                      disabled={isActing || !job.id}
                      title={job.match_status === "saved" ? "Quitar de guardadas" : "Guardar"}
                      className={`p-2 rounded-lg border transition-all disabled:opacity-40 ${
                        job.match_status === "saved"
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                          : "border-white/10 text-white/30 hover:text-amber-400 hover:border-amber-500/30"
                      }`}
                    >
                      <svg className="w-4 h-4" fill={job.match_status === "saved" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setMatchStatus(job, "dismissed")}
                      disabled={isActing || !job.id}
                      title="Descartar — no me interesa"
                      className="p-2 rounded-lg border border-white/10 text-white/30 hover:text-red-400 hover:border-red-500/30 transition-all disabled:opacity-40"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Barra de acciones principales */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5 flex-wrap">
                  {!job.applied ? (
                    <button
                      onClick={() => handleApplied(job)}
                      disabled={isActing || !job.id}
                      className="flex items-center gap-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-3.5 py-2 rounded-lg transition-all disabled:opacity-40 font-medium"
                    >
                      {isActing ? <SpinIcon small /> : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      Me postulé
                    </button>
                  ) : (
                    <span className="text-xs text-blue-400/60 px-3.5 py-2">En tu pipeline ✓</span>
                  )}
                  <button
                    onClick={() => handleTailor(job)}
                    disabled={!!tailoring || !job.description}
                    title={job.description ? "Genera una versión de tu CV adaptada a esta vacante" : "Sin descripción disponible"}
                    className="flex items-center gap-1.5 text-xs bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 px-3.5 py-2 rounded-lg transition-all disabled:opacity-40 font-medium"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Adaptar mi CV
                  </button>
                  <a
                    href={jobLink(job)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-xs text-white/40 hover:text-white/80 px-3 py-2 transition-colors"
                  >
                    {isAI ? "Buscar en Google →" : "Ver vacante →"}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1d2e] border border-white/15 text-white text-sm px-5 py-3 rounded-xl shadow-2xl z-50">
          {toast}
        </div>
      )}

      {/* Modal de tailoring */}
      {tailoring && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#1a1d2e] border border-white/10 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-6">
              <svg className="w-7 h-7 text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-center mb-1">Adaptando tu CV</h3>
            <p className="text-white/40 text-xs text-center mb-1">{tailoring.title} · {tailoring.company}</p>
            <p className="text-violet-300 text-sm text-center my-4 min-h-[20px]">{TAILOR_STEPS[tailorStep]}</p>
            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(95, (tailorStep + 1) * 16)}%` }}
              />
            </div>
            <p className="text-xs text-white/25 text-center mt-3">~20 segundos · se creará una nueva versión de tu CV</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SpinIcon({ small }: { small?: boolean }) {
  return (
    <svg className={`${small ? "w-3.5 h-3.5" : "w-4 h-4"} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

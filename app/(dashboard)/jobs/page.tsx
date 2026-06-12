"use client";

import { useState } from "react";

interface Job {
  external_id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  salary_min?: number;
  salary_max?: number;
  posted_at?: string;
  source: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    setLoading(true);
    const res = await fetch("/api/jobs/search", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setJobs(data.jobs ?? []);
    }
    setLoading(false);
    setSearched(true);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Vacantes para ti</h1>
          <p className="text-white/40 text-sm mt-1">
            Búsqueda en tiempo real con Google Search · basada en tu perfil de CV
          </p>
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Buscando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Buscar ahora
            </>
          )}
        </button>
      </div>

      {/* Estado vacío */}
      {!searched && !loading && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-white/40 font-medium">Haz clic en "Buscar ahora"</p>
          <p className="text-white/25 text-sm mt-1">Encontraremos vacantes reales que encajan con tu perfil</p>
        </div>
      )}

      {searched && jobs.length === 0 && !loading && (
        <div className="text-center py-20">
          <p className="text-white/40">No se encontraron vacantes. Verifica que tienes un CV analizado con perfil completo.</p>
        </div>
      )}

      {/* Lista de trabajos */}
      {jobs.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-white/30 mb-4">{jobs.length} vacantes encontradas</p>
          {jobs.map((job) => (
            <div
              key={job.external_id}
              className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:border-white/10 hover:bg-white/[0.07] transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white truncate">{job.title}</h3>
                    {job.remote && (
                      <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Remoto
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/60 mt-0.5">{job.company}</p>
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
                    <span className="text-xs text-white/20 capitalize">{job.source}</span>
                  </div>
                </div>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 bg-violet-600/20 border border-violet-500/30 text-violet-400 text-xs px-4 py-2 rounded-xl hover:bg-violet-600/40 transition-all"
                >
                  Ver →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

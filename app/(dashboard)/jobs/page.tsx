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
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Vacantes para ti</h1>
          <p className="text-gray-500 text-sm mt-1">
            Buscamos en JSearch, Adzuna y Jooble basándonos en tu perfil y radio de búsqueda.
          </p>
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Buscando..." : "🔍 Buscar ahora"}
        </button>
      </div>

      {searched && jobs.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p>No se encontraron vacantes. Verifica tu perfil y radio de búsqueda.</p>
        </div>
      )}

      {!searched && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">💼</p>
          <p>Haz clic en "Buscar ahora" para encontrar vacantes que encajan con tu perfil.</p>
        </div>
      )}

      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.external_id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
                <p className="text-sm text-gray-600 mt-0.5">{job.company}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-400">📍 {job.location || "No especificado"}</span>
                  {job.remote && (
                    <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">
                      Remoto
                    </span>
                  )}
                  <span className="text-xs text-gray-300 capitalize">{job.source}</span>
                </div>
                {(job.salary_min || job.salary_max) && (
                  <p className="text-xs text-gray-500 mt-1">
                    💰 {job.salary_min ? `$${job.salary_min.toLocaleString()}` : ""}
                    {job.salary_min && job.salary_max ? " – " : ""}
                    {job.salary_max ? `$${job.salary_max.toLocaleString()}` : ""}
                  </p>
                )}
              </div>
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 bg-blue-600 text-white text-xs px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ver vacante →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

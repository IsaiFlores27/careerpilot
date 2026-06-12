import { searchJSearch } from "./jsearch";
import { searchAdzuna } from "./adzuna";
import { searchJooble } from "./jooble";
import { searchJobsWithGemini } from "./gemini-search";
import type { NormalizedJob, JobSearchParams } from "./types";

/**
 * Busca vacantes priorizando fuentes REALES:
 *  1. APIs externas (JSearch/Adzuna/Jooble) — vacantes actuales con URL real de postulación
 *  2. Gemini (sugerencias IA) — solo como complemento si las fuentes reales traen pocas
 *
 * Las fuentes reales corren en paralelo; si juntan suficientes resultados,
 * ni siquiera se llama a Gemini (ahorra cuota y maximiza calidad).
 */
const MIN_REAL_JOBS_TO_SKIP_AI = 6;

export async function searchAllSources(params: JobSearchParams): Promise<NormalizedJob[]> {
  const realTasks: Array<Promise<NormalizedJob[]>> = [];
  if (process.env.RAPIDAPI_KEY) realTasks.push(searchJSearch(params));
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) realTasks.push(searchAdzuna(params));
  if (process.env.JOOBLE_API_KEY) realTasks.push(searchJooble(params));

  let realJobs: NormalizedJob[] = [];
  if (realTasks.length > 0) {
    const settled = await Promise.allSettled(realTasks);
    realJobs = deduplicateJobs(
      settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    );
  }

  // Suficientes vacantes reales → no generamos sugerencias IA
  if (realJobs.length >= MIN_REAL_JOBS_TO_SKIP_AI) {
    return realJobs;
  }

  // Complementar con sugerencias IA (etiquetadas como source 'manual' en la UI)
  let aiJobs: NormalizedJob[] = [];
  try {
    aiJobs = await searchJobsWithGemini(params);
  } catch {
    // si Gemini falla, devolvemos lo real que haya
  }

  // Reales primero, sugerencias IA después
  return deduplicateJobs([...realJobs, ...aiJobs]);
}

function deduplicateJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  const seen = new Map<string, NormalizedJob>();

  for (const job of jobs) {
    // Clave de dedup: normaliza título + empresa
    const key = normalizeKey(`${job.title}_${job.company}`);

    if (!seen.has(key)) {
      seen.set(key, job);
    } else {
      // Prefiere fuentes reales (jsearch/adzuna/jooble) sobre sugerencias IA
      const existing = seen.get(key)!;
      if (existing.source === "manual" && job.source !== "manual") {
        seen.set(key, job);
      }
    }
  }

  return Array.from(seen.values());
}

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .substring(0, 50);
}

export type { NormalizedJob, JobSearchParams };

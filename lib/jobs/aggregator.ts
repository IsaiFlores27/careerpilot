import { searchJSearch } from "./jsearch";
import { searchAdzuna } from "./adzuna";
import { searchJooble } from "./jooble";
import { searchJobsWithGemini } from "./gemini-search";
import type { NormalizedJob, JobSearchParams } from "./types";

/**
 * Busca vacantes combinando:
 *  1. Gemini con Google Search grounding (fuente principal — busca en internet en vivo)
 *  2. APIs externas (JSearch/Adzuna/Jooble) como complemento, solo si tienen API key
 *
 * Todo corre en paralelo; si una fuente falla, no rompe las demás.
 */
export async function searchAllSources(params: JobSearchParams): Promise<NormalizedJob[]> {
  const tasks: Array<Promise<NormalizedJob[]>> = [
    // Gemini siempre se ejecuta (fuente principal)
    searchJobsWithGemini(params),
  ];

  // Las APIs externas solo si están configuradas (evita llamadas inútiles)
  if (process.env.RAPIDAPI_KEY) tasks.push(searchJSearch(params));
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) tasks.push(searchAdzuna(params));
  if (process.env.JOOBLE_API_KEY) tasks.push(searchJooble(params));

  const settled = await Promise.allSettled(tasks);

  const all: NormalizedJob[] = settled.flatMap((r) =>
    r.status === "fulfilled" ? r.value : []
  );

  return deduplicateJobs(all);
}

function deduplicateJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  const seen = new Map<string, NormalizedJob>();

  for (const job of jobs) {
    // Clave de dedup: normaliza título + empresa
    const key = normalizeKey(`${job.title}_${job.company}`);

    if (!seen.has(key)) {
      seen.set(key, job);
    } else {
      // Prefiere JSearch (más datos) sobre Jooble
      const existing = seen.get(key)!;
      if (job.source === "jsearch" && existing.source !== "jsearch") {
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

import { getGeminiClient, GEMINI_MODELS } from "@/lib/gemini/client";
import type { NormalizedJob, JobSearchParams } from "./types";

export async function searchJobsWithGemini(
  params: JobSearchParams
): Promise<NormalizedJob[]> {
  const client = getGeminiClient();

  const locationText = params.location
    ? `en ${params.location} o alrededores`
    : "en México";
  const remoteText = params.remote_ok
    ? " Incluye también posiciones 100% remotas."
    : "";

  const prompt = `Eres un analista del mercado laboral. Genera 10 perfiles de vacante REALISTAS para el puesto "${params.query}" ${locationText}.${remoteText}

Refleja el mercado laboral real actual en México/Latinoamérica: usa nombres de empresas reales que operan en la región y SÍ contratan este tipo de rol (BBVA, Santander, Cemex, OXXO, Liverpool, Grupo Bimbo, Softtek, Wizeline, Clip, Konfío, Rappi, Amazon, Mercado Libre, PepsiCo, Nestlé, etc.), con rangos salariales y requisitos típicos del mercado.

IMPORTANTE sobre el campo "url": déjalo SIEMPRE como cadena vacía "". NO inventes URLs. El sistema generará un enlace de búsqueda real automáticamente.

Devuelve ÚNICAMENTE un array JSON válido, sin texto adicional ni markdown:
[
  {
    "title": "título exacto del puesto",
    "company": "nombre empresa real",
    "location": "ciudad, país",
    "remote": true o false,
    "url": "",
    "description": "descripción de 3-4 líneas con responsabilidades, tecnologías y requisitos específicos del puesto",
    "salary_min": número en MXN o null,
    "salary_max": número en MXN o null
  }
]

Genera exactamente 10 vacantes variadas con empresas y títulos diferentes.`;

  let response;
  try {
    response = await client.models.generateContent({
      model: GEMINI_MODELS.fast,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    });
  } catch (err) {
    console.error("[gemini-search] generateContent error:", err);
    // Hard fallback: try without responseMimeType
    try {
      response = await client.models.generateContent({
        model: GEMINI_MODELS.fast,
        contents: prompt,
        config: { maxOutputTokens: 8192 },
      });
    } catch (err2) {
      console.error("[gemini-search] fallback error:", err2);
      return [];
    }
  }

  const text = response.text ?? "";
  console.log("[gemini-search] response length:", text.length);

  const jobs = parseJobsFromText(text);
  console.log("[gemini-search] parsed jobs:", jobs.length);

  return jobs.map((job): NormalizedJob => ({
    external_id: `gemini_${hashString(`${job.title}_${job.company}_${params.query}`)}`,
    source: "manual",
    title: job.title ?? "",
    company: job.company ?? "",
    description: job.description ?? "",
    url: job.url || "",
    location: job.location ?? params.location,
    remote: job.remote ?? false,
    salary_min: job.salary_min ?? undefined,
    salary_max: job.salary_max ?? undefined,
    posted_at: undefined,
  }));
}

interface RawGeminiJob {
  title?: string;
  company?: string;
  location?: string;
  remote?: boolean;
  url?: string;
  description?: string;
  salary_min?: number | null;
  salary_max?: number | null;
}

function parseJobsFromText(text: string): RawGeminiJob[] {
  let cleaned = text.trim();

  // Strip markdown fences if present
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  // Extract JSON array
  const arrayStart = cleaned.indexOf("[");
  const arrayEnd = cleaned.lastIndexOf("]");
  if (arrayStart === -1 || arrayEnd === -1) {
    console.error("[gemini-search] no JSON array found in:", cleaned.slice(0, 300));
    return [];
  }

  try {
    const parsed = JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("[gemini-search] JSON parse error:", e, "text:", cleaned.slice(0, 300));
    return [];
  }
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

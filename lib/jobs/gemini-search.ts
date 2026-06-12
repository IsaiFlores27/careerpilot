import { getGeminiClient, GEMINI_MODELS } from "@/lib/gemini/client";
import type { NormalizedJob, JobSearchParams } from "./types";

/**
 * Busca vacantes reales en internet usando Gemini con grounding de Google Search.
 * A diferencia de las APIs externas, esto consulta Google en tiempo real y devuelve
 * vacantes actuales con URLs verificables (LinkedIn, Indeed, OCC, Computrabajo, etc.).
 */
export async function searchJobsWithGemini(
  params: JobSearchParams
): Promise<NormalizedJob[]> {
  const client = getGeminiClient();

  const radiusText = params.radius_km
    ? `dentro de un radio de ${params.radius_km} km de ${params.location}`
    : `en ${params.location}`;

  const remoteText = params.remote_ok ? " Incluye también vacantes 100% remotas." : "";

  const prompt = `Busca en Google ofertas de trabajo REALES y ACTUALES para el puesto "${params.query}" ubicadas ${radiusText}.${remoteText}

Busca en portales de empleo como LinkedIn Jobs, Indeed, OCC, Computrabajo, Glassdoor, Bumeran y sitios de carreras de empresas.

Para cada vacante encontrada, extrae:
- Título exacto del puesto
- Nombre de la empresa
- Ubicación
- Si es remoto (true/false)
- URL directa a la vacante
- Una descripción breve (2-3 líneas) de lo que pide
- Rango salarial si está disponible

Devuelve ÚNICAMENTE un array JSON válido (sin texto adicional, sin markdown) con esta estructura exacta:
[
  {
    "title": "string",
    "company": "string",
    "location": "string",
    "remote": boolean,
    "url": "string",
    "description": "string",
    "salary_min": number o null,
    "salary_max": number o null
  }
]

Encuentra entre 8 y 15 vacantes reales. NO inventes vacantes ni URLs: solo incluye las que realmente encuentres en las búsquedas.`;

  let response;
  try {
    response = await client.models.generateContent({
      model: GEMINI_MODELS.fast,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        maxOutputTokens: 8192,
      },
    });
  } catch (err) {
    console.error("[gemini-search] generateContent error:", err);
    return [];
  }

  const text = response.text ?? "";
  console.log("[gemini-search] raw response length:", text.length, "| first 200:", text.slice(0, 200));
  const jobs = parseJobsFromText(text);

  // Recuperar las fuentes/URLs del grounding para enriquecer/validar
  const groundingUrls = extractGroundingUrls(response);

  return jobs.map((job, i): NormalizedJob => ({
    external_id: `gemini_${hashString(`${job.title}_${job.company}_${job.url}`)}`,
    source: "manual", // marcamos como fuente Gemini/grounding
    title: job.title ?? "",
    company: job.company ?? "",
    description: job.description ?? "",
    url: job.url || groundingUrls[i] || "",
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
  // Limpiar posibles fences de markdown
  let cleaned = text.trim();
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    cleaned = jsonMatch[1].trim();
  }

  // Extraer el primer array JSON que aparezca
  const arrayStart = cleaned.indexOf("[");
  const arrayEnd = cleaned.lastIndexOf("]");
  if (arrayStart === -1 || arrayEnd === -1) return [];

  try {
    const parsed = JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function extractGroundingUrls(response: unknown): string[] {
  try {
    const r = response as {
      candidates?: Array<{
        groundingMetadata?: {
          groundingChunks?: Array<{ web?: { uri?: string } }>;
        };
      }>;
    };
    const chunks = r.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    return chunks.map((c) => c.web?.uri ?? "").filter(Boolean);
  } catch {
    return [];
  }
}

// Hash simple y determinista para generar external_id estable (dedup)
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

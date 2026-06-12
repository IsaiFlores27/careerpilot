import { generateStructured } from "@/lib/gemini/generate";
import { GEMINI_MODELS } from "@/lib/gemini/client";
import { CV_PROFILE_JSON_SCHEMA, type CvProfile } from "../schemas/cv-profile";

export interface TailorResult {
  tailored: CvProfile;
  keyword_coverage: {
    total_keywords: number;
    covered: number;
    covered_list: string[];
    missing: string[];
  };
  match_score: number;
  gaps: string[];
}

const TAILOR_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    tailored: CV_PROFILE_JSON_SCHEMA,
    keyword_coverage: {
      type: "object",
      properties: {
        total_keywords: { type: "number" },
        covered: { type: "number" },
        covered_list: { type: "array", items: { type: "string" } },
        missing: { type: "array", items: { type: "string" } },
      },
      required: ["total_keywords", "covered", "covered_list", "missing"],
    },
    match_score: { type: "number" },
    gaps: { type: "array", items: { type: "string" } },
  },
  required: ["tailored", "keyword_coverage", "match_score", "gaps"],
};

export async function tailorCv(
  profile: CvProfile,
  jobTitle: string,
  jobDescription: string,
  companyName: string
): Promise<TailorResult> {
  const systemPrompt = `Eres un experto en adaptación de CVs a vacantes específicas. Tu tarea es ajustar el CV del usuario para maximizar su match con la descripción de la vacante.

REGLAS:
1. Extrae las keywords clave del JD (job description): habilidades técnicas, herramientas, metodologías, verbos de acción
2. Reordena la experiencia para que lo más relevante para ESTA vacante aparezca primero
3. Inyecta las keywords del JD de forma NATURAL en bullets y summary (sin keyword stuffing)
4. Ajusta el headline para que incluya el título exacto de la vacante
5. Personaliza el summary mencionando el nombre de la empresa y el puesto
6. NUNCA inventes logros, fechas ni empleadores
7. Si hay gaps reales de habilidades, lístallos en gaps (no los inventes)`;

  return generateStructured<TailorResult>({
    model: GEMINI_MODELS.quality,
    systemInstruction: systemPrompt,
    prompt: `Adapta este CV para la vacante de "${jobTitle}" en "${companyName}".

DESCRIPCIÓN DE LA VACANTE:
${jobDescription}

CV DEL CANDIDATO:
${JSON.stringify(profile, null, 2)}`,
    jsonSchema: TAILOR_OUTPUT_SCHEMA,
    maxOutputTokens: 8192,
  });
}

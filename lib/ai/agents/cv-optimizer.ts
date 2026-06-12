import { generateStructured } from "@/lib/gemini/generate";
import { GEMINI_MODELS } from "@/lib/gemini/client";
import { CV_PROFILE_JSON_SCHEMA, type CvProfile } from "../schemas/cv-profile";

export interface OptimizeResult {
  optimized: CvProfile;
  changes: Array<{
    section: string;
    field: string;
    original: string;
    optimized: string;
    reason: string;
  }>;
  needs_user_input: Array<{
    field: string;
    question: string;
  }>;
}

const OPTIMIZE_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    optimized: CV_PROFILE_JSON_SCHEMA,
    changes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          section: { type: "string" },
          field: { type: "string" },
          original: { type: "string" },
          optimized: { type: "string" },
          reason: { type: "string" },
        },
        required: ["section", "field", "original", "optimized", "reason"],
      },
    },
    needs_user_input: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string" },
          question: { type: "string" },
        },
        required: ["field", "question"],
      },
    },
  },
  required: ["optimized", "changes", "needs_user_input"],
};

export async function optimizeCv(
  profile: CvProfile,
  targetRole: string,
  targetIndustry: string
): Promise<OptimizeResult> {
  const systemPrompt = `Actúa como un reclutador sénior contratando para "${targetRole}" en "${targetIndustry}".

Tu misión: reescribir el currículum para:
1. PASAR los filtros ATS: keywords relevantes al puesto, formato limpio, secciones estándar
2. IMPRESIONAR a un humano en 6 segundos: logros medibles con métricas de impacto
3. REEMPLAZAR responsabilidades vagas por logros con verbos de acción potentes (Lideré, Aumenté, Reduje, Implementé, Automaticé...)
4. CUANTIFICAR resultados: si hay una métrica posible, ponla (% de mejora, $, usuarios, tiempo)
5. Hazlo premium, conciso e imposible de ignorar

REGLAS CRÍTICAS:
- NUNCA inventes datos, logros, empleadores ni fechas que no estén en el CV original
- Si falta una métrica para un logro que claramente debería tenerla, agrega el campo a needs_user_input con la pregunta específica al usuario
- Mantén el mismo número de experiencias/trabajos — no elimines ni agregues
- El headline debe incluir el puesto objetivo naturalmente
- Las habilidades deben incluir keywords del puesto objetivo si el perfil las justifica

Devuelve el JSON con el CV optimizado, los cambios realizados (diff) y las preguntas para el usuario.`;

  return generateStructured<OptimizeResult>({
    model: GEMINI_MODELS.quality,
    systemInstruction: systemPrompt,
    prompt: `Optimiza este CV para ATS y reclutadores humanos:\n\n${JSON.stringify(profile, null, 2)}`,
    jsonSchema: OPTIMIZE_OUTPUT_SCHEMA,
    maxOutputTokens: 8192,
  });
}

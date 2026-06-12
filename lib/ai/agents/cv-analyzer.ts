import { generateStructured } from "@/lib/gemini/generate";
import { GEMINI_MODELS } from "@/lib/gemini/client";
import { CV_PROFILE_JSON_SCHEMA, CvProfileSchema, type CvProfile } from "../schemas/cv-profile";

const SYSTEM_ANALYZER = `Eres un reclutador sénior con 15 años de experiencia en selección de talento y optimización de CVs para sistemas ATS (Applicant Tracking Systems). Tu tarea es analizar el currículum vitae proporcionado y devolver un análisis exhaustivo y honesto.

INSTRUCCIONES:
1. Extrae TODA la información estructurada del CV sin omitir nada.
2. Para cada bullet de experiencia, identifica si tiene métricas de impacto (cifras, porcentajes, montos) o si solo describe responsabilidades vagas.
3. Calcula el ATS score (0-100) basado en: presencia de keywords, logros medibles, formato limpio, secciones completas.
4. En el diagnóstico, sé brutalmente honesto pero constructivo.
5. NUNCA inventes información que no esté en el CV. Si falta algo, indícalo en diagnosis.
6. Las top_3_priorities deben ser los cambios con mayor impacto potencial.

Responde únicamente con el JSON estructurado requerido.`;

export async function analyzeCv(
  fileContent: Buffer | string,
  mimeType: "application/pdf" | "text/plain"
): Promise<CvProfile> {
  let promptParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;

  if (mimeType === "application/pdf") {
    const base64 = Buffer.isBuffer(fileContent)
      ? fileContent.toString("base64")
      : Buffer.from(fileContent, "binary").toString("base64");

    promptParts = [
      { inlineData: { mimeType: "application/pdf", data: base64 } },
      { text: "Extrae el perfil estructurado y diagnostica este CV." },
    ];
  } else {
    promptParts = [
      {
        text: `Aquí está el texto del CV:\n\n${fileContent}\n\nExtrae el perfil estructurado y diagnostica este CV.`,
      },
    ];
  }

  const result = await generateStructured<unknown>({
    model: GEMINI_MODELS.quality,
    systemInstruction: SYSTEM_ANALYZER,
    prompt: promptParts,
    jsonSchema: CV_PROFILE_JSON_SCHEMA,
    maxOutputTokens: 8192,
  });

  const parsed = CvProfileSchema.safeParse(result);
  if (!parsed.success) {
    throw new Error(`Schema inválido: ${parsed.error.message}`);
  }

  return parsed.data;
}

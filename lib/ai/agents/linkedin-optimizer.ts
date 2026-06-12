import { generateStructured } from "@/lib/gemini/generate";
import { GEMINI_MODELS } from "@/lib/gemini/client";
import type { CvProfile } from "../schemas/cv-profile";

export interface LinkedInProfile {
  headline: string;
  about: string;
  featured_skills: string[];
  experiences: Array<{
    role: string;
    company: string;
    description: string;
  }>;
  keywords_used: string[];
  copy_paste_ready: {
    headline: string;
    about: string;
  };
}

const LINKEDIN_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    about: { type: "string" },
    featured_skills: { type: "array", items: { type: "string" } },
    experiences: {
      type: "array",
      items: {
        type: "object",
        properties: {
          role: { type: "string" },
          company: { type: "string" },
          description: { type: "string" },
        },
        required: ["role", "company", "description"],
      },
    },
    keywords_used: { type: "array", items: { type: "string" } },
    copy_paste_ready: {
      type: "object",
      properties: {
        headline: { type: "string" },
        about: { type: "string" },
      },
      required: ["headline", "about"],
    },
  },
  required: ["headline", "about", "featured_skills", "experiences", "keywords_used", "copy_paste_ready"],
};

export async function optimizeLinkedIn(
  profile: CvProfile,
  targetRole: string,
  targetIndustry: string
): Promise<LinkedInProfile> {
  const systemPrompt = `Eres un experto en LinkedIn y marca personal profesional. Tu misión es optimizar el perfil de LinkedIn del usuario para:

1. SER DESCUBRIBLE por reclutadores que buscan "${targetRole}" en "${targetIndustry}"
2. SER CREÍBLE para los responsables de contratación (HRs y hiring managers)
3. SER MEMORABLE para fundadores y tomadores de decisión

REGLAS DEL TITULAR (headline):
- Máximo 220 caracteres
- Incluye el puesto objetivo + 2-3 keywords secundarias
- Usa el formato: [Título] | [Especialidad] | [Resultado o propuesta de valor]
- Evita "En búsqueda de oportunidades" — suena desesperado

REGLAS DEL "ACERCA DE":
- Los primeros 300 caracteres son los más importantes (son lo visible antes del "ver más")
- Empieza con un hook que describa QUÉ HACES y PARA QUIÉN
- Incluye 3-4 logros concretos con métricas
- Cierra con un CTA claro: qué tipo de proyectos o roles busca
- Máximo 2000 caracteres
- Escribe en primera persona, tono profesional pero humano

APTITUDES DESTACADAS:
- Selecciona las 10-15 más relevantes para el puesto objetivo
- Mezcla técnicas y transferibles
- Prioriza las que reclutadores buscan activamente

EXPERIENCIAS (top 3):
- Primeros 2 bullets deben ser logros con métricas, no responsabilidades
- Máximo 5 bullets por experiencia
- Usa keywords del sector naturalmente`;

  return generateStructured<LinkedInProfile>({
    model: GEMINI_MODELS.quality,
    systemInstruction: systemPrompt,
    prompt: `Optimiza el perfil de LinkedIn para el puesto de "${targetRole}" en el sector "${targetIndustry}".

PERFIL DEL CANDIDATO:
${JSON.stringify(
  {
    headline: profile.headline,
    summary: profile.summary,
    experience: profile.experience.slice(0, 3),
    skills: profile.skills,
    languages: profile.languages,
  },
  null,
  2
)}`,
    jsonSchema: LINKEDIN_OUTPUT_SCHEMA,
    maxOutputTokens: 4096,
  });
}

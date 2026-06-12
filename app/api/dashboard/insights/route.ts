export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getGeminiClient, GEMINI_MODELS } from "@/lib/gemini/client";

interface SkillRadar {
  label: string;   // "Técnicas", "Liderazgo", etc.
  score: number;   // 0-100
}

interface Course {
  title: string;
  provider: string;   // Coursera, Udemy, certificación oficial...
  reason: string;     // por qué cierra una brecha
  url: string;
}

interface Insights {
  seniority: "junior" | "mid" | "senior" | "lead";
  seniority_label: string;       // "Senior", "Mid-level"...
  percentile: number;            // 0-100, "estás en el top X%"
  percentile_text: string;       // explicación corta
  years_experience: number;
  radar: SkillRadar[];           // 4-6 ejes
  courses: Course[];             // 4-6
  strengths: string[];           // 3
  growth_areas: string[];        // 3
}

const SCHEMA = {
  type: "object",
  properties: {
    seniority: { type: "string", enum: ["junior", "mid", "senior", "lead"] },
    seniority_label: { type: "string" },
    percentile: { type: "number" },
    percentile_text: { type: "string" },
    years_experience: { type: "number" },
    radar: {
      type: "array",
      items: {
        type: "object",
        properties: { label: { type: "string" }, score: { type: "number" } },
        required: ["label", "score"],
      },
    },
    courses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          provider: { type: "string" },
          reason: { type: "string" },
          url: { type: "string" },
        },
        required: ["title", "provider", "reason", "url"],
      },
    },
    strengths: { type: "array", items: { type: "string" } },
    growth_areas: { type: "array", items: { type: "string" } },
  },
  required: ["seniority", "seniority_label", "percentile", "percentile_text", "years_experience", "radar", "courses", "strengths", "growth_areas"],
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const serviceClient = await createServiceClient();

  // Determinar CV activo (o más reciente)
  const profileResult = await serviceClient.from("profiles").select("active_resume_id, target_role").eq("id", user.id).single();
  const activeId = (profileResult.data as Record<string, unknown> | null)?.active_resume_id as string | undefined;
  const targetRole = (profileResult.data as Record<string, unknown> | null)?.target_role as string | undefined;

  const resumeResult = activeId
    ? await serviceClient.from("resumes").select("id, structured, ats_score").eq("id", activeId).single()
    : await serviceClient
        .from("resumes").select("id, structured, ats_score")
        .eq("user_id", user.id).in("kind", ["optimized", "original"])
        .order("created_at", { ascending: false }).limit(1).single();

  const resume = resumeResult.data;
  if (!resume?.structured) {
    return NextResponse.json({ insights: null, resume_id: null });
  }

  // ¿Hay cache para este CV?
  const cached = await serviceClient
    .from("dashboard_insights")
    .select("data")
    .eq("user_id", user.id)
    .eq("resume_id", resume.id)
    .single();

  if (cached.data?.data) {
    return NextResponse.json({ insights: cached.data.data, resume_id: resume.id, cached: true });
  }

  // Generar con Gemini
  const profile = resume.structured;
  const prompt = `Analiza este perfil profesional y genera un análisis de carrera comparativo.

PERFIL (JSON):
${JSON.stringify({
    headline: profile.headline,
    summary: profile.summary,
    experience: profile.experience,
    education: profile.education,
    skills: profile.skills,
    languages: profile.languages,
    certifications: profile.certifications,
  })}

ROL OBJETIVO: ${targetRole ?? profile.headline ?? "según el perfil"}
ATS SCORE ACTUAL: ${resume.ats_score ?? "N/A"}

Genera:
1. seniority y seniority_label: nivel real (junior/mid/senior/lead) según años y responsabilidades. Label en español.
2. percentile (0-100): en qué percentil está este perfil comparado con profesionales típicos de su área/rol. Sé realista. percentile_text: frase corta tipo "Por encima del 65% de los perfiles de QA en México".
3. years_experience: años totales estimados de experiencia (número).
4. radar: 5 ejes de competencia con score 0-100 cada uno. Ejes típicos: "Técnico", "Liderazgo", "Herramientas", "Comunicación", "Idiomas". Adapta los ejes al área del candidato.
5. courses: 5 cursos/certificaciones REALES y específicos para cerrar las brechas detectadas. Usa proveedores reales (Coursera, Udemy, Platzi, certificaciones oficiales como AWS/PMI/Six Sigma/etc). url plausible del proveedor. reason: por qué le sirve a ESTE perfil.
6. strengths: 3 fortalezas concretas del perfil.
7. growth_areas: 3 áreas de mejora concretas.

Responde solo JSON válido según el esquema.`;

  let insights: Insights | null = null;
  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.quality,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: SCHEMA,
        maxOutputTokens: 4096,
      },
    });
    const text = response.text ?? "";
    insights = JSON.parse(text) as Insights;
  } catch (err) {
    console.error("[dashboard/insights] generation error:", err);
    return NextResponse.json({ insights: null, resume_id: resume.id, error: "No se pudo generar el análisis" });
  }

  // Guardar cache
  void serviceClient.from("dashboard_insights").upsert(
    { user_id: user.id, resume_id: resume.id, data: insights },
    { onConflict: "user_id,resume_id" }
  );

  return NextResponse.json({ insights, resume_id: resume.id, cached: false });
}

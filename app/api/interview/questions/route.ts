export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getGeminiClient, GEMINI_MODELS } from "@/lib/gemini/client";

const SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          focus: { type: "string" },     // qué evalúa esta pregunta
          tip: { type: "string" },        // pista corta de cómo enfocarla
        },
        required: ["question", "focus", "tip"],
      },
    },
  },
  required: ["questions"],
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { job_title, company, description, interview_type } = await request.json();
  if (!job_title) return NextResponse.json({ error: "job_title requerido" }, { status: 400 });

  // Contexto del CV activo para personalizar las preguntas
  const serviceClient = await createServiceClient();
  const profileResult = await serviceClient.from("profiles").select("active_resume_id").eq("id", user.id).single();
  const activeId = (profileResult.data as Record<string, unknown> | null)?.active_resume_id as string | undefined;
  const resumeResult = activeId
    ? await serviceClient.from("resumes").select("structured").eq("id", activeId).single()
    : await serviceClient.from("resumes").select("structured").eq("user_id", user.id)
        .in("kind", ["optimized", "original"]).order("created_at", { ascending: false }).limit(1).single();

  const cvSummary = resumeResult.data?.structured
    ? JSON.stringify({
        headline: resumeResult.data.structured.headline,
        experience: resumeResult.data.structured.experience?.slice(0, 3),
        skills: resumeResult.data.structured.skills,
      })
    : "No disponible";

  const prompt = `Eres un entrevistador senior de la empresa ${company || "objetivo"} contratando para el puesto "${job_title}".
Tipo de entrevista: ${interview_type ?? "mixta (técnica + comportamental)"}.
${description ? `Descripción de la vacante:\n${description}\n` : ""}
Perfil del candidato (su CV):
${cvSummary}

Genera exactamente 6 preguntas de entrevista REALISTAS y específicas para este puesto y este candidato:
- 2 técnicas/de conocimiento del rol
- 2 comportamentales (método STAR) que toquen su experiencia real
- 1 situacional difícil
- 1 sobre motivación/encaje cultural

Para cada una incluye "focus" (qué evalúa, 5-8 palabras) y "tip" (pista de cómo enfocar la respuesta, 1 frase).
En español. Responde solo JSON.`;

  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.quality,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: SCHEMA,
        maxOutputTokens: 3000,
      },
    });
    const data = JSON.parse(response.text ?? "{}");
    return NextResponse.json({ questions: data.questions ?? [] });
  } catch (err) {
    console.error("[interview/questions] error:", err);
    return NextResponse.json({ error: "No se pudieron generar las preguntas. Intenta de nuevo." }, { status: 500 });
  }
}

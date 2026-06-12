export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeminiClient, GEMINI_MODELS } from "@/lib/gemini/client";

const SCHEMA = {
  type: "object",
  properties: {
    score: { type: "number" },              // 0-100
    verdict: { type: "string" },             // resumen en 1 frase
    strengths: { type: "array", items: { type: "string" } },   // qué hizo bien (1-2)
    improvements: { type: "array", items: { type: "string" } },// qué mejorar (1-3)
    improved_answer: { type: "string" },      // versión mejorada de la respuesta
  },
  required: ["score", "verdict", "strengths", "improvements", "improved_answer"],
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { job_title, question, answer, focus } = await request.json();
  if (!question || !answer) {
    return NextResponse.json({ error: "question y answer requeridos" }, { status: 400 });
  }

  const prompt = `Eres un coach de entrevistas senior. Evalúa esta respuesta de un candidato al puesto "${job_title ?? "el puesto"}".

PREGUNTA: ${question}
${focus ? `QUÉ EVALÚA: ${focus}` : ""}

RESPUESTA DEL CANDIDATO:
"${answer}"

Evalúa con honestidad y criterio de reclutador real:
- score (0-100): estructura, especificidad, métricas, relevancia al puesto. Una respuesta vaga o genérica no pasa de 50.
- verdict: 1 frase directa sobre la respuesta.
- strengths: 1-2 cosas que hizo bien (si las hay).
- improvements: 1-3 mejoras concretas (ej. "Falta el resultado medible al final", "No menciona su rol específico en el logro").
- improved_answer: reescribe SU respuesta aplicando método STAR cuando aplique, manteniendo sus datos reales sin inventar — solo reestructura y refuerza. Máximo 120 palabras.

En español. Responde solo JSON.`;

  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.quality,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: SCHEMA,
        maxOutputTokens: 2000,
      },
    });
    const data = JSON.parse(response.text ?? "{}");
    return NextResponse.json(data);
  } catch (err) {
    console.error("[interview/evaluate] error:", err);
    return NextResponse.json({ error: "No se pudo evaluar la respuesta. Intenta de nuevo." }, { status: 500 });
  }
}

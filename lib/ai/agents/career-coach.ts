import { getGeminiClient, GEMINI_MODELS } from "@/lib/gemini/client";
import { generateText } from "@/lib/gemini/generate";
import type { CvProfile } from "../schemas/cv-profile";
import { Type, type FunctionDeclaration, type Content } from "@google/genai";

export interface CoachMessage {
  role: "user" | "assistant";
  content: string;
}

export interface UserContext {
  profile: CvProfile;
  targetRole: string;
  targetIndustry: string;
  location: string;
  pipeline?: Array<{
    job_title: string;
    company: string;
    status: string;
    applied_at: string;
  }>;
}

// Herramientas del coach (prompts 3-7) en formato Gemini function declarations
const COACH_TOOLS: FunctionDeclaration[] = [
  {
    name: "generate_seven_day_plan",
    description:
      "Genera un plan de búsqueda de empleo de 7 días personalizado con portales, fuentes ocultas, keywords, objetivos diarios de contacto y estrategia de networking.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        urgency: { type: Type.STRING, enum: ["alta", "media", "baja"] },
        hours_per_day: { type: Type.NUMBER },
      },
    },
  },
  {
    name: "generate_cold_message",
    description:
      "Genera un mensaje en frío para LinkedIn (<75 palabras) dirigido al hiring manager de una empresa específica.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        company: { type: Type.STRING },
        job_title: { type: Type.STRING },
        hiring_manager_name: { type: Type.STRING },
        company_context: { type: Type.STRING },
      },
      required: ["company", "job_title"],
    },
  },
  {
    name: "generate_cover_letter",
    description: "Genera una carta de presentación de élite adaptada a una vacante específica.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        job_title: { type: Type.STRING },
        company: { type: Type.STRING },
        job_description: { type: Type.STRING },
        tone: { type: Type.STRING, enum: ["formal", "profesional", "directo"] },
      },
      required: ["job_title", "company", "job_description"],
    },
  },
  {
    name: "generate_interview_prep",
    description:
      "Genera preguntas probables de entrevista con respuestas modelo usando el método STAR basadas en los logros reales del CV.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        job_title: { type: Type.STRING },
        company: { type: Type.STRING },
        job_description: { type: Type.STRING },
        interview_type: { type: Type.STRING, enum: ["técnica", "comportamental", "panel", "CEO"] },
      },
      required: ["job_title", "company"],
    },
  },
  {
    name: "generate_follow_up",
    description: "Genera mensajes de seguimiento post-postulación o post-networking.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        context: { type: Type.STRING, enum: ["post_aplicacion", "post_entrevista", "post_networking"] },
        company: { type: Type.STRING },
        contact_name: { type: Type.STRING },
        days_since_contact: { type: Type.NUMBER },
        notes: { type: Type.STRING },
      },
      required: ["context", "company"],
    },
  },
];

function buildSystemInstruction(context: UserContext): string {
  return `Eres CareerPilot, un coach de carrera de élite especializado en búsqueda de empleo de alta conversión.

PERFIL DEL USUARIO:
- Nombre: ${context.profile.contact.name}
- Puesto objetivo: ${context.targetRole}
- Industria objetivo: ${context.targetIndustry}
- Ubicación: ${context.location}
- ATS Score actual: ${context.profile.diagnosis.ats_score}/100
- Top prioridades: ${context.profile.diagnosis.top_3_priorities.join(", ")}

FILOSOFÍA:
- Eres directo, práctico y orientado a resultados. Sin rodeos.
- Das consejos específicos basados en el perfil real del usuario, no genéricos.
- Cuando el usuario pida un entregable (plan, mensaje, carta, prep), usa la función correspondiente.
- Si el usuario pregunta sobre su pipeline, tienes acceso a sus postulaciones.
- Habla siempre en el idioma del usuario (detecta automáticamente).

PIPELINE ACTUAL:
${context.pipeline ? JSON.stringify(context.pipeline, null, 2) : "Sin postulaciones activas aún."}`;
}

export async function streamCoachChat(
  messages: CoachMessage[],
  context: UserContext,
  toolExecutor: (toolName: string, toolInput: Record<string, unknown>) => Promise<string>
): Promise<ReadableStream<Uint8Array>> {
  const client = getGeminiClient();
  const systemInstruction = buildSystemInstruction(context);

  // Convertir historial a formato Gemini Content (user/model)
  const history: Content[] = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const contents = [...history];
        let continueLoop = true;

        while (continueLoop) {
          const stream = await client.models.generateContentStream({
            model: GEMINI_MODELS.quality,
            contents,
            config: {
              systemInstruction,
              tools: [{ functionDeclarations: COACH_TOOLS }],
            },
          });

          const functionCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
          const modelParts: Array<Record<string, unknown>> = [];

          for await (const chunk of stream) {
            // Texto incremental
            const text = chunk.text;
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "text", text })}\n\n`)
              );
            }

            // Detectar llamadas a funciones
            const calls = chunk.functionCalls;
            if (calls && calls.length > 0) {
              for (const call of calls) {
                if (call.name) {
                  functionCalls.push({
                    name: call.name,
                    args: (call.args ?? {}) as Record<string, unknown>,
                  });
                  modelParts.push({ functionCall: { name: call.name, args: call.args ?? {} } });
                }
              }
            }
          }

          if (functionCalls.length > 0) {
            // Agregar el turno del modelo con las function calls
            contents.push({ role: "model", parts: modelParts as Content["parts"] });

            // Ejecutar cada función y agregar la respuesta
            const responseParts: Array<Record<string, unknown>> = [];
            for (const call of functionCalls) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "tool_start", tool: call.name })}\n\n`)
              );

              const result = await toolExecutor(call.name, call.args);

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "tool_end", tool: call.name })}\n\n`)
              );

              responseParts.push({
                functionResponse: {
                  name: call.name,
                  response: { result },
                },
              });
            }

            contents.push({ role: "user", parts: responseParts as Content["parts"] });
          } else {
            continueLoop = false;
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

// Ejecutor de las herramientas del coach (genera el contenido con Gemini)
export function createToolExecutor(context: UserContext) {
  return async (toolName: string, input: Record<string, unknown>): Promise<string> => {
    switch (toolName) {
      case "generate_seven_day_plan":
        return generateSevenDayPlan(context, input);
      case "generate_cold_message":
        return generateColdMessage(context, input);
      case "generate_cover_letter":
        return generateCoverLetter(context, input);
      case "generate_interview_prep":
        return generateInterviewPrep(context, input);
      case "generate_follow_up":
        return generateFollowUp(context, input);
      default:
        return `Función "${toolName}" no reconocida`;
    }
  };
}

async function generateSevenDayPlan(
  context: UserContext,
  input: Record<string, unknown>
): Promise<string> {
  return generateText({
    model: GEMINI_MODELS.quality,
    maxOutputTokens: 3000,
    prompt: `Crea un plan de búsqueda de empleo de 7 días para ${context.profile.contact.name} que busca el puesto de "${context.targetRole}" en "${context.targetIndustry}", basado en ${context.location}.

Urgencia: ${input.urgency || "media"}
Horas disponibles por día: ${input.hours_per_day || 2}

PERFIL:
- Skills: ${[...context.profile.skills.hard, ...context.profile.skills.tools].slice(0, 10).join(", ")}
- Experiencia: ${context.profile.experience[0]?.role} en ${context.profile.experience[0]?.company}

El plan debe incluir:
- Portales específicos a usar (LinkedIn, Indeed, OCC, Computrabajo, Stack Overflow Jobs para tech, etc.)
- Fuentes ocultas (networking, grupos, comunidades, headhunters del sector)
- Keywords de búsqueda exactas para cada portal
- Objetivos diarios: X postulaciones + Y mensajes de networking + Z llamadas/cafés
- Estrategia de networking específica para el sector
- Debe ser REALISTA y de ALTA CONVERSIÓN, no motivacional genérico

Formato: Día 1, Día 2... con acciones concretas y medibles.`,
  });
}

async function generateColdMessage(
  context: UserContext,
  input: Record<string, unknown>
): Promise<string> {
  return generateText({
    model: GEMINI_MODELS.quality,
    maxOutputTokens: 500,
    prompt: `Escribe un mensaje en frío para LinkedIn de MÁXIMO 75 palabras para ${context.profile.contact.name}, dirigido al hiring manager de "${input.company}" para el puesto de "${input.job_title}".

${input.hiring_manager_name ? `Hiring Manager: ${input.hiring_manager_name}` : "El nombre del hiring manager no está disponible, usa una apertura genérica apropiada"}
${input.company_context ? `Contexto específico de la empresa: ${input.company_context}` : ""}

LOGROS REALES DEL CANDIDATO:
${context.profile.experience[0]?.achievements_with_metrics?.slice(0, 3).join("\n") || context.profile.experience[0]?.bullets.slice(0, 3).join("\n")}

ESTRUCTURA OBLIGATORIA:
1. Gancho específico sobre la empresa (no genérico)
2. Una propuesta de valor concreta con métrica
3. Petición de baja fricción (una pregunta o llamada de 15 min)

Devuelve SOLO el mensaje, listo para copiar y pegar.`,
  });
}

async function generateCoverLetter(
  context: UserContext,
  input: Record<string, unknown>
): Promise<string> {
  return generateText({
    model: GEMINI_MODELS.quality,
    maxOutputTokens: 1500,
    prompt: `Escribe una carta de presentación de élite para ${context.profile.contact.name} para el puesto de "${input.job_title}" en "${input.company}".

DESCRIPCIÓN DE LA VACANTE:
${input.job_description}

PERFIL DEL CANDIDATO:
- Headline: ${context.profile.headline}
- Logro más fuerte: ${context.profile.experience[0]?.achievements_with_metrics?.[0] || context.profile.experience[0]?.bullets?.[0]}
- Skills principales: ${context.profile.skills.hard.slice(0, 5).join(", ")}

TONO: ${input.tone || "profesional"}

REGLAS:
- Máximo 3 párrafos cortos
- Párrafo 1: Por qué ESTA empresa y ESTE puesto (específico, no genérico)
- Párrafo 2: El logro más relevante con métrica que demuestre fit
- Párrafo 3: CTA claro y seguro (no suplicante)
- NO empieces con "Me complace..." o "Por medio de la presente..."
- Sé directo, seguro y memorable`,
  });
}

async function generateInterviewPrep(
  context: UserContext,
  input: Record<string, unknown>
): Promise<string> {
  return generateText({
    model: GEMINI_MODELS.quality,
    maxOutputTokens: 3000,
    prompt: `Prepara a ${context.profile.contact.name} para la entrevista de "${input.job_title}" en "${input.company}".

${input.job_description ? `DESCRIPCIÓN DEL PUESTO:\n${input.job_description}` : ""}
Tipo de entrevista: ${input.interview_type || "comportamental y técnica"}

LOGROS REALES PARA USAR EN RESPUESTAS STAR:
${JSON.stringify(
  context.profile.experience.slice(0, 3).map((e) => ({
    empresa: e.company,
    puesto: e.role,
    logros: e.achievements_with_metrics || e.bullets.slice(0, 3),
  })),
  null,
  2
)}

ENTREGA:
1. Top 8 preguntas más probables para este puesto y empresa
2. Para las 4 más importantes: respuesta modelo usando STAR con los logros REALES del candidato
3. Preguntas que el candidato debe hacer al entrevistador (mínimo 5)
4. Señales de alerta (red flags) a detectar en la empresa durante la entrevista
5. Puntos a destacar del CV que son altamente relevantes para esta vacante`,
  });
}

async function generateFollowUp(
  context: UserContext,
  input: Record<string, unknown>
): Promise<string> {
  const contextMap: Record<string, string> = {
    post_aplicacion: "después de enviar una aplicación sin respuesta",
    post_entrevista: "después de una entrevista",
    post_networking: "después de una conversación de networking",
  };

  return generateText({
    model: GEMINI_MODELS.cheap,
    maxOutputTokens: 600,
    prompt: `Escribe un mensaje de seguimiento para ${context.profile.contact.name} ${contextMap[input.context as string] || "de seguimiento"} con "${input.company}".

${input.contact_name ? `Contacto: ${input.contact_name}` : ""}
Días desde el último contacto: ${input.days_since_contact || "no especificado"}
${input.notes ? `Notas de la conversación anterior: ${input.notes}` : ""}

REGLAS:
- Máximo 50 palabras
- Tono profesional pero cálido, no desesperado
- Agrega valor (un artículo, una observación, un dato nuevo) — no solo preguntes si ya revisaron tu CV
- Si es post-entrevista, reitera un punto específico de la conversación
- Termina con una pregunta o acción concreta de baja fricción

Devuelve SOLO el mensaje, listo para enviar.`,
  });
}

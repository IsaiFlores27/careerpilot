import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { streamCoachChat, createToolExecutor, type CoachMessage } from "@/lib/ai/agents/career-coach";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { message, history = [] } = await request.json();

  if (!message) {
    return NextResponse.json({ error: "message requerido" }, { status: 400 });
  }

  const serviceClient = await createServiceClient();

  // Cargar contexto del usuario
  const profileResult = await serviceClient.from("profiles").select("*").eq("id", user.id).single();
  const profileData = profileResult.data;
  const activeId = (profileData as Record<string, unknown>)?.active_resume_id as string | undefined;

  const [resumeResult, pipelineResult] = await Promise.all([
    activeId
      ? serviceClient.from("resumes").select("structured").eq("id", activeId).single()
      : serviceClient
          .from("resumes")
          .select("structured")
          .eq("user_id", user.id)
          .in("kind", ["optimized", "original"])
          .order("created_at", { ascending: false })
          .limit(1)
          .single(),
    serviceClient
      .from("applications")
      .select("status, applied_at, jobs(title, company)")
      .eq("user_id", user.id)
      .order("applied_at", { ascending: false })
      .limit(5),
  ]);

  if (!resumeResult.data?.structured) {
    return NextResponse.json(
      { error: "Primero sube y analiza tu CV para activar el coach" },
      { status: 400 }
    );
  }

  const profile = profileData;
  const cvProfile = resumeResult.data.structured;

  const pipeline = pipelineResult.data?.map((app) => {
    const jobData = app.jobs as unknown as { title?: string; company?: string } | null;
    return {
      job_title: jobData?.title ?? "Vacante",
      company: jobData?.company ?? "Empresa",
      status: app.status,
      applied_at: app.applied_at,
    };
  });

  const userContext = {
    profile: cvProfile,
    targetRole: profile?.target_role ?? cvProfile.headline,
    targetIndustry: profile?.target_industry ?? "",
    location: profile?.location ?? cvProfile.contact.location ?? "",
    pipeline,
  };

  // Construir historial de mensajes
  const messages: CoachMessage[] = [
    ...history,
    { role: "user" as const, content: message },
  ];

  // Guardar mensaje del usuario
  await serviceClient.from("coach_messages").insert({
    user_id: user.id,
    role: "user",
    content: [{ type: "text", text: message }],
  });

  const toolExecutor = createToolExecutor(userContext);

  // Wrappear el stream para capturar la respuesta completa y guardarla
  const rawStream = await streamCoachChat(messages, userContext, toolExecutor);

  let assistantText = "";
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const wrappedStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = rawStream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        controller.enqueue(value);
        // Acumular texto del asistente
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "text") assistantText += data.text;
            } catch { /* ignorar */ }
          }
        }
      }
      controller.close();
      // Guardar respuesta del asistente en BD (fire and forget)
      if (assistantText) {
        void serviceClient.from("coach_messages").insert({
          user_id: user.id,
          role: "assistant",
          content: [{ type: "text", text: assistantText }],
        });
      }
    },
  });

  return new NextResponse(wrappedStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

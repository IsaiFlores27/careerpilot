import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { optimizeCv } from "@/lib/ai/agents/cv-optimizer";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { resume_id } = await request.json();
  if (!resume_id) {
    return NextResponse.json({ error: "resume_id requerido" }, { status: 400 });
  }

  const serviceClient = await createServiceClient();

  // Cargar el CV original y el perfil del usuario
  const [resumeResult, profileResult] = await Promise.all([
    serviceClient
      .from("resumes")
      .select("structured")
      .eq("id", resume_id)
      .eq("user_id", user.id)
      .single(),
    serviceClient
      .from("profiles")
      .select("target_role, target_industry")
      .eq("id", user.id)
      .single(),
  ]);

  if (resumeResult.error || !resumeResult.data?.structured) {
    return NextResponse.json({ error: "CV no encontrado o sin analizar" }, { status: 404 });
  }

  const targetRole = profileResult.data?.target_role ?? "el puesto objetivo";
  const targetIndustry = profileResult.data?.target_industry ?? "la industria objetivo";

  const result = await optimizeCv(
    resumeResult.data.structured,
    targetRole,
    targetIndustry
  );

  // Guardar la versión optimizada como nueva fila
  const { data: optimized, error: insertError } = await serviceClient
    .from("resumes")
    .insert({
      user_id: user.id,
      kind: "optimized",
      parent_id: resume_id,
      structured: result.optimized,
      ats_score: result.optimized.diagnosis?.ats_score,
      diagnosis: result.optimized.diagnosis,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Insert error:", insertError);
    return NextResponse.json({ error: "Error al guardar la versión optimizada" }, { status: 500 });
  }

  return NextResponse.json({
    optimized_resume_id: optimized.id,
    optimized_profile: result.optimized,
    changes: result.changes,
    needs_user_input: result.needs_user_input,
  });
}

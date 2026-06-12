import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { tailorCv } from "@/lib/ai/agents/cv-tailor";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { resume_id, job_id, job_title, company, description } = await request.json();

  if (!resume_id || !job_title || !company || !description) {
    return NextResponse.json(
      { error: "Faltan campos: resume_id, job_title, company, description" },
      { status: 400 }
    );
  }

  const serviceClient = await createServiceClient();

  const { data: resume, error } = await serviceClient
    .from("resumes")
    .select("structured")
    .eq("id", resume_id)
    .eq("user_id", user.id)
    .single();

  if (error || !resume?.structured) {
    return NextResponse.json({ error: "CV no encontrado" }, { status: 404 });
  }

  const result = await tailorCv(resume.structured, job_title, description, company);

  const { data: tailored, error: insertError } = await serviceClient
    .from("resumes")
    .insert({
      user_id: user.id,
      kind: "tailored",
      parent_id: resume_id,
      job_id: job_id ?? null,
      structured: result.tailored,
      ats_score: result.tailored.diagnosis?.ats_score,
      diagnosis: result.tailored.diagnosis,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }

  return NextResponse.json({
    tailored_resume_id: tailored.id,
    tailored_profile: result.tailored,
    keyword_coverage: result.keyword_coverage,
    match_score: result.match_score,
    gaps: result.gaps,
  });
}

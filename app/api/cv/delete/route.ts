export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const resume_id = searchParams.get("resume_id");
  if (!resume_id) return NextResponse.json({ error: "resume_id requerido" }, { status: 400 });

  const serviceClient = await createServiceClient();

  // Verify ownership
  const { data: resume } = await serviceClient
    .from("resumes")
    .select("id, storage_path")
    .eq("id", resume_id)
    .eq("user_id", user.id)
    .single();

  if (!resume) return NextResponse.json({ error: "CV no encontrado" }, { status: 404 });

  // Delete storage file if exists
  if (resume.storage_path) {
    await serviceClient.storage.from("resumes").remove([resume.storage_path]);
  }

  // Cascade: delete related job_matches, coach_artifacts, coach_messages tied to this resume
  // (resumes row deletion will cascade via FK on job_matches.resume_id and applications.resume_id)

  // If this was the active resume, clear it from profile
  await serviceClient
    .from("profiles")
    .update({ active_resume_id: null })
    .eq("id", user.id)
    .eq("active_resume_id", resume_id);

  // Delete the resume row
  const { error } = await serviceClient
    .from("resumes")
    .delete()
    .eq("id", resume_id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

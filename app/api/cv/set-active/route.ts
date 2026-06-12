export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { resume_id } = await request.json();
  if (!resume_id) return NextResponse.json({ error: "resume_id requerido" }, { status: 400 });

  const serviceClient = await createServiceClient();

  // Verify the resume belongs to this user
  const { data: resume } = await serviceClient
    .from("resumes")
    .select("id")
    .eq("id", resume_id)
    .eq("user_id", user.id)
    .single();

  if (!resume) return NextResponse.json({ error: "CV no encontrado" }, { status: 404 });

  // Upsert profile with active_resume_id
  const { error } = await serviceClient
    .from("profiles")
    .upsert({ id: user.id, active_resume_id: resume_id }, { onConflict: "id" });

  if (error) {
    // Column doesn't exist yet — return helpful error
    if (error.message?.includes("active_resume_id")) {
      return NextResponse.json({
        error: "Migración pendiente",
        sql: "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_resume_id uuid REFERENCES resumes(id) ON DELETE SET NULL;",
      }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

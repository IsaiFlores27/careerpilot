export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const serviceClient = await createServiceClient();

  const [resumesResult, profileResult] = await Promise.all([
    serviceClient
      .from("resumes")
      .select("id, kind, ats_score, original_filename, created_at, structured")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    serviceClient
      .from("profiles")
      .select("active_resume_id")
      .eq("id", user.id)
      .single(),
  ]);

  const active_resume_id = (profileResult.data as Record<string, unknown> | null)?.active_resume_id ?? null;

  return NextResponse.json({
    resumes: resumesResult.data ?? [],
    active_resume_id,
  });
}

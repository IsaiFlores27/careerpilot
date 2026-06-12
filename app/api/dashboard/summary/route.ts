export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const serviceClient = await createServiceClient();

  const profileResult = await serviceClient
    .from("profiles").select("full_name, target_role, active_resume_id").eq("id", user.id).single();
  const activeId = (profileResult.data as Record<string, unknown> | null)?.active_resume_id as string | undefined;

  const [resumeResult, applicationsResult, matchesResult, historyResult] = await Promise.all([
    activeId
      ? serviceClient.from("resumes").select("id, kind, ats_score, diagnosis, structured, created_at, original_filename").eq("id", activeId).single()
      : serviceClient
          .from("resumes").select("id, kind, ats_score, diagnosis, structured, created_at, original_filename")
          .eq("user_id", user.id).in("kind", ["optimized", "original"])
          .order("created_at", { ascending: false }).limit(1).single(),
    serviceClient.from("applications").select("status").eq("user_id", user.id),
    serviceClient.from("job_matches").select("match_score").eq("user_id", user.id).eq("status", "suggested"),
    serviceClient
      .from("resumes").select("kind, ats_score, created_at")
      .eq("user_id", user.id).not("ats_score", "is", null)
      .order("created_at", { ascending: true }).limit(20),
  ]);

  const resume = resumeResult.data;
  const applications = applicationsResult.data ?? [];
  const matches = matchesResult.data ?? [];

  // Métricas derivadas del CV (instantáneo, sin IA)
  let derived = null;
  if (resume?.structured) {
    const p = resume.structured;
    const skillsCount =
      (p.skills?.hard?.length ?? 0) + (p.skills?.soft?.length ?? 0) + (p.skills?.tools?.length ?? 0);
    derived = {
      name: p.contact?.name ?? null,
      headline: p.headline ?? null,
      skills_count: skillsCount,
      experience_count: p.experience?.length ?? 0,
      languages_count: p.languages?.length ?? 0,
      certifications_count: p.certifications?.length ?? 0,
      education_count: p.education?.length ?? 0,
    };
  }

  return NextResponse.json({
    full_name: profileResult.data?.full_name ?? null,
    target_role: profileResult.data?.target_role ?? null,
    resume_id: resume?.id ?? null,
    resume_kind: resume?.kind ?? null,
    ats_score: resume?.ats_score ?? null,
    top_3_priorities: resume?.diagnosis?.top_3_priorities ?? null,
    score_history: historyResult.data ?? [],
    derived,
    stats: {
      applications: applications.length,
      interviews: applications.filter((a) => a.status === "interview").length,
      offers: applications.filter((a) => a.status === "offer").length,
      pending_matches: matches.length,
    },
  });
}

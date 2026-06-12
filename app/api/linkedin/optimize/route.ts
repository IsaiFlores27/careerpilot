import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { optimizeLinkedIn } from "@/lib/ai/agents/linkedin-optimizer";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const serviceClient = await createServiceClient();

  const profileResult = await serviceClient
    .from("profiles").select("target_role, target_industry, active_resume_id").eq("id", user.id).single();
  const activeId = (profileResult.data as Record<string, unknown>)?.active_resume_id as string | undefined;

  const resumeResult = activeId
    ? await serviceClient.from("resumes").select("structured").eq("id", activeId).single()
    : await serviceClient
        .from("resumes")
        .select("structured")
        .eq("user_id", user.id)
        .in("kind", ["optimized", "original"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

  if (!resumeResult.data?.structured) {
    return NextResponse.json({ error: "Primero sube y analiza tu CV" }, { status: 400 });
  }

  const targetRole = profileResult.data?.target_role ?? "el puesto objetivo";
  const targetIndustry = profileResult.data?.target_industry ?? "tu industria";

  const linkedInProfile = await optimizeLinkedIn(
    resumeResult.data.structured,
    targetRole,
    targetIndustry
  );

  // Persistir como artefacto
  await serviceClient.from("coach_artifacts").insert({
    user_id: user.id,
    type: "linkedin_profile",
    content: linkedInProfile,
  });

  return NextResponse.json(linkedInProfile);
}

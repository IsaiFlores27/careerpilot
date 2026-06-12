import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { searchAllSources } from "@/lib/jobs/aggregator";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const serviceClient = await createServiceClient();

  // Cargar perfil (incluye active_resume_id si ya se aplicó la migración)
  const profileResult = await serviceClient
    .from("profiles").select("*").eq("id", user.id).single();
  const profile = profileResult.data;

  // Usar CV activo si está definido, si no el más reciente
  const activeId = (profile as Record<string, unknown>)?.active_resume_id as string | undefined;
  const resumeQuery = serviceClient
    .from("resumes")
    .select("id, structured")
    .eq("user_id", user.id)
    .in("kind", ["optimized", "original"])
    .order("created_at", { ascending: false })
    .limit(1);
  const resumeResult = activeId
    ? await serviceClient.from("resumes").select("id, structured").eq("id", activeId).single()
    : await resumeQuery.single();

  const resume = resumeResult.data;

  if (!resume?.structured) {
    return NextResponse.json(
      { error: "Primero sube y analiza tu CV para poder buscar vacantes" },
      { status: 400 }
    );
  }

  // Construir query desde perfil o directamente del CV
  const query =
    profile?.target_role ??
    resume.structured.headline ??
    resume.structured.experience?.[0]?.role ??
    "profesional";

  const jobs = await searchAllSources({
    query,
    location: profile?.location ?? "",
    lat: profile?.lat,
    lng: profile?.lng,
    radius_km: profile?.search_radius_km ?? 25,
    remote_ok: profile?.remote_ok ?? true,
    limit: 15,
  });

  // Guardar vacantes nuevas en BD (upsert por external_id)
  if (jobs.length > 0) {
    await serviceClient.from("jobs").upsert(jobs, {
      onConflict: "external_id",
      ignoreDuplicates: true,
    });
  }

  // Crear matches usuario ↔ vacante
  const jobRows = await serviceClient
    .from("jobs")
    .select("id, external_id")
    .in("external_id", jobs.map((j) => j.external_id));

  if (jobRows.data && jobRows.data.length > 0) {
    const matches = jobRows.data.map((j) => ({
      user_id: user.id,
      job_id: j.id,
      status: "suggested",
    }));

    await serviceClient.from("job_matches").upsert(matches, {
      onConflict: "user_id,job_id",
      ignoreDuplicates: true,
    });
  }

  return NextResponse.json({ jobs, total: jobs.length });
}

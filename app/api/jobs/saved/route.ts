export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const serviceClient = await createServiceClient();

  // Matches sugeridos y guardados (los descartados no se muestran)
  const { data, error } = await serviceClient
    .from("job_matches")
    .select(`
      status,
      match_score,
      jobs (
        id, external_id, title, company, location, remote,
        url, description, salary_min, salary_max, posted_at, source, created_at
      )
    `)
    .eq("user_id", user.id)
    .in("status", ["suggested", "saved"])
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // IDs de jobs a los que ya se postuló (para marcar en UI)
  const { data: apps } = await serviceClient
    .from("applications")
    .select("job_id")
    .eq("user_id", user.id);
  const appliedIds = new Set((apps ?? []).map((a) => a.job_id));

  const jobs = (data ?? [])
    .map((m) => {
      const j = m.jobs as unknown as {
        id: string; external_id: string; title: string; company: string;
        location: string; remote: boolean; url: string; description?: string;
        salary_min?: number; salary_max?: number; posted_at?: string;
        source: string; created_at?: string;
      } | null;
      if (!j) return null;
      return {
        ...j,
        match_status: m.status as string,
        match_score: m.match_score as number | null,
        applied: appliedIds.has(j.id),
      };
    })
    .filter(Boolean)
    // Más recientes primero (created_at del job)
    .sort((a, b) => (b!.created_at ?? "").localeCompare(a!.created_at ?? ""));

  return NextResponse.json({ jobs });
}

import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const serviceClient = await createServiceClient();

  // Cargar job_matches del usuario con los datos del job
  const { data } = await serviceClient
    .from("job_matches")
    .select(`
      status,
      jobs (
        external_id, title, company, location, remote,
        url, salary_min, salary_max, posted_at, source
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "suggested")
    .order("created_at", { ascending: false })
    .limit(50);

  const jobs = (data ?? [])
    .map((m) => m.jobs as unknown as {
      external_id: string; title: string; company: string;
      location: string; remote: boolean; url: string;
      salary_min?: number; salary_max?: number;
      posted_at?: string; source: string;
    } | null)
    .filter(Boolean);

  return NextResponse.json({ jobs });
}

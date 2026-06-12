export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// GET — lista las postulaciones del usuario con datos del job
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const serviceClient = await createServiceClient();
  const { data, error } = await serviceClient
    .from("applications")
    .select("id, status, applied_at, next_follow_up_at, notes, job_id, jobs(title, company, location, url)")
    .eq("user_id", user.id)
    .order("applied_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applications: data ?? [] });
}

// POST — registra una postulación.
// Body: { job_id } (vacante existente) o { title, company, location?, url? } (manual)
// Opcionales: notes, status, next_follow_up_at
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const serviceClient = await createServiceClient();

  let jobId: string | null = body.job_id ?? null;

  // Postulación manual: crear el job primero
  if (!jobId) {
    if (!body.title || !body.company) {
      return NextResponse.json({ error: "Faltan campos: title y company (o job_id)" }, { status: 400 });
    }
    const { data: job, error: jobError } = await serviceClient
      .from("jobs")
      .insert({
        external_id: `manual_${user.id.slice(0, 8)}_${body.title.slice(0, 30).replace(/\W/g, "_")}_${body.company.slice(0, 20).replace(/\W/g, "_")}`,
        source: "manual",
        title: body.title,
        company: body.company,
        location: body.location ?? null,
        url: body.url ?? null,
      })
      .select("id")
      .single();
    if (jobError) {
      // external_id duplicado → buscar el existente
      const { data: existing } = await serviceClient
        .from("jobs").select("id")
        .eq("external_id", `manual_${user.id.slice(0, 8)}_${body.title.slice(0, 30).replace(/\W/g, "_")}_${body.company.slice(0, 20).replace(/\W/g, "_")}`)
        .single();
      if (!existing) return NextResponse.json({ error: jobError.message }, { status: 500 });
      jobId = existing.id;
    } else {
      jobId = job.id;
    }
  }

  // Evitar duplicado de postulación al mismo job
  const { data: dup } = await serviceClient
    .from("applications").select("id")
    .eq("user_id", user.id).eq("job_id", jobId).limit(1);
  if (dup && dup.length > 0) {
    return NextResponse.json({ error: "Ya registraste una postulación a esta vacante", application_id: dup[0].id }, { status: 409 });
  }

  // Follow-up por defecto: +5 días
  const followUp = body.next_follow_up_at
    ?? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

  const { data: app, error } = await serviceClient
    .from("applications")
    .insert({
      user_id: user.id,
      job_id: jobId,
      resume_id: body.resume_id ?? null,
      status: body.status ?? "applied",
      notes: body.notes ?? null,
      next_follow_up_at: followUp,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Si venía de una vacante sugerida, marcar el match como guardado
  if (body.job_id) {
    void serviceClient
      .from("job_matches")
      .update({ status: "saved" })
      .eq("user_id", user.id)
      .eq("job_id", body.job_id);
  }

  return NextResponse.json({ ok: true, application_id: app.id });
}

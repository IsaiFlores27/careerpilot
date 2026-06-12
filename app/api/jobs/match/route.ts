export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// POST — cambia el estado de un match: saved (guardar), dismissed (descartar), suggested (restaurar)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { job_id, status } = await request.json();
  if (!job_id || !["saved", "dismissed", "suggested"].includes(status)) {
    return NextResponse.json({ error: "job_id y status (saved|dismissed|suggested) requeridos" }, { status: 400 });
  }

  const serviceClient = await createServiceClient();
  const { error } = await serviceClient
    .from("job_matches")
    .upsert(
      { user_id: user.id, job_id, status },
      { onConflict: "user_id,job_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

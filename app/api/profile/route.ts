export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const serviceClient = await createServiceClient();
  const { data } = await serviceClient
    .from("profiles")
    .select("full_name, target_role, target_industry, location, search_radius_km, remote_ok, salary_min, onboarding_complete")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ profile: data ?? null, email: user.email });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const allowed = ["full_name", "target_role", "target_industry", "location", "search_radius_km", "remote_ok", "salary_min"];
  const updates: Record<string, unknown> = { id: user.id };
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  // Onboarding completo si tiene rol objetivo y ubicación
  if (body.target_role && body.location) {
    updates.onboarding_complete = true;
  }

  const serviceClient = await createServiceClient();
  const { error } = await serviceClient
    .from("profiles")
    .upsert(updates, { onConflict: "id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const serviceClient = await createServiceClient();
  const { data } = await serviceClient
    .from("coach_artifacts")
    .select("content, created_at")
    .eq("user_id", user.id)
    .eq("type", "linkedin_profile")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ result: data?.content ?? null });
}

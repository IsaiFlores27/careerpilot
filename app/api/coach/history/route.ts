import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const serviceClient = await createServiceClient();
  const { data } = await serviceClient
    .from("coach_messages")
    .select("role, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(100);

  const messages = (data ?? []).map((row) => ({
    role: row.role as "user" | "assistant",
    content: Array.isArray(row.content)
      ? row.content.map((c: { text?: string }) => c.text ?? "").join("")
      : String(row.content),
  }));

  return NextResponse.json({ messages });
}

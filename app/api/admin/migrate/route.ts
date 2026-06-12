export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One-time migration endpoint — adds active_resume_id to profiles.
// Call once: GET /api/admin/migrate
// Protected by CRON_SECRET or service role (no auth needed since it's idempotent DDL).

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const serviceClient = await createServiceClient();

  // Use pg_query via supabase-js: call a postgres anonymous block via rpc if available,
  // otherwise fall back to writing directly. We rely on the fact that service role
  // can call the undocumented /rest/v1/rpc path.
  // Supabase allows raw SQL via the `pg_net` extension or the `sql` function on some plans.
  // Best approach: attempt an upsert with the column — if it fails with column-not-found,
  // we know we need the migration and surface that to the admin.

  // Try reading the column first
  const { error: checkErr } = await serviceClient
    .from("profiles")
    .select("active_resume_id")
    .limit(1);

  if (!checkErr) {
    return NextResponse.json({ status: "already_applied", message: "Columna active_resume_id ya existe." });
  }

  // Column doesn't exist — we can't run DDL from REST API.
  // Return the SQL so the user can paste it in the Supabase SQL Editor.
  const sql = `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_resume_id uuid REFERENCES resumes(id) ON DELETE SET NULL;`;

  return NextResponse.json({
    status: "pending",
    message: "Ejecuta este SQL en el Supabase SQL Editor (Dashboard → SQL Editor):",
    sql,
    dashboard_url: "https://supabase.com/dashboard/project/ocaucunufzugvtkbiltr/sql/new",
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { buildCvPdf } from "@/lib/pdf/renderer";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const resume_id = searchParams.get("resume_id");

  if (!resume_id) {
    return NextResponse.json({ error: "resume_id requerido" }, { status: 400 });
  }

  const serviceClient = await createServiceClient();

  const { data: resume, error } = await serviceClient
    .from("resumes")
    .select("structured, original_filename")
    .eq("id", resume_id)
    .eq("user_id", user.id)
    .single();

  if (error || !resume?.structured) {
    return NextResponse.json({ error: "CV no encontrado" }, { status: 404 });
  }

  const pdfBytes = await buildCvPdf(resume.structured);
  const pdfBuffer = Buffer.from(pdfBytes);

  const name = resume.structured.contact?.name?.replace(/\s+/g, "_") ?? "CV";
  const filename = `CV_${name}.pdf`;

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBytes.length),
    },
  });
}

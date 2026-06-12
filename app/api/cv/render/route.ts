import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToBuffer } = require("@react-pdf/renderer");
import { CvDocument } from "@/lib/pdf/renderer";
import React from "react";

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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const pdfBuffer = await renderToBuffer(
    React.createElement(CvDocument, { profile: resume.structured })
  ) as Buffer;

  const filename = `CV_${resume.structured.contact?.name?.replace(/\s+/g, "_") ?? "CareerPilot"}.pdf`;
  const uint8Array = new Uint8Array(pdfBuffer);

  return new NextResponse(uint8Array, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(uint8Array.length),
    },
  });
}

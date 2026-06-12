import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowedExts = ["pdf", "doc", "docx"];
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/octet-stream",
    "",
  ];

  if (!allowedExts.includes(ext) && !allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: `Tipo no permitido: ${file.type || "desconocido"} (.${ext}). Solo PDF o Word.` },
      { status: 400 }
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "El archivo no puede superar 10 MB" },
      { status: 400 }
    );
  }

  // Subir a Supabase Storage (bucket privado)
  const serviceClient = await createServiceClient();
  const storagePath = `${user.id}/${Date.now()}.${ext || "pdf"}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await serviceClient.storage
    .from("resumes")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage error:", JSON.stringify(uploadError));
    return NextResponse.json({ error: `Storage: ${uploadError.message}` }, { status: 500 });
  }

  // Crear registro en BD con estado pendiente (el análisis se hace aparte)
  const { data: resume, error: dbError } = await serviceClient
    .from("resumes")
    .insert({
      user_id: user.id,
      kind: "original",
      storage_path: storagePath,
      original_filename: file.name,
    })
    .select("id")
    .single();

  if (dbError) {
    console.error("DB error:", JSON.stringify(dbError));
    return NextResponse.json({ error: `DB: ${dbError.message}` }, { status: 500 });
  }

  return NextResponse.json({ resume_id: resume.id, storage_path: storagePath });
}

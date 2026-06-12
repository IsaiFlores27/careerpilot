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

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ];

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Solo se aceptan archivos PDF o Word (.docx)" },
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
  const ext = file.name.split(".").pop() ?? "pdf";
  const storagePath = `${user.id}/${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await serviceClient.storage
    .from("resumes")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage error:", uploadError);
    return NextResponse.json({ error: "Error al subir el archivo" }, { status: 500 });
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
    console.error("DB error:", dbError);
    return NextResponse.json({ error: "Error al registrar el CV" }, { status: 500 });
  }

  return NextResponse.json({ resume_id: resume.id, storage_path: storagePath });
}

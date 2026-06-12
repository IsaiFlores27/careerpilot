import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { analyzeCv } from "@/lib/ai/agents/cv-analyzer";
import { generateEmbedding } from "@/lib/gemini/embeddings";
import mammoth from "mammoth";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { resume_id } = await request.json();
  if (!resume_id) {
    return NextResponse.json({ error: "resume_id requerido" }, { status: 400 });
  }

  const serviceClient = await createServiceClient();

  // Recuperar el registro del CV
  const { data: resume, error: fetchError } = await serviceClient
    .from("resumes")
    .select("*")
    .eq("id", resume_id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !resume) {
    return NextResponse.json({ error: "CV no encontrado" }, { status: 404 });
  }

  // Descargar el archivo de Storage
  const { data: fileData, error: downloadError } = await serviceClient.storage
    .from("resumes")
    .download(resume.storage_path);

  if (downloadError || !fileData) {
    return NextResponse.json({ error: "Error al leer el archivo" }, { status: 500 });
  }

  const arrayBuffer = await fileData.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const isPdf = resume.storage_path.endsWith(".pdf");

  let profile;

  if (isPdf) {
    profile = await analyzeCv(buffer, "application/pdf");
  } else {
    // Convertir .docx a texto plano con mammoth
    const result = await mammoth.extractRawText({ buffer });
    profile = await analyzeCv(result.value, "text/plain");
  }

  // Generar embedding del perfil para matching semántico (Gemini embeddings)
  const embeddingText = [
    profile.headline,
    profile.summary,
    ...profile.skills.hard,
    ...profile.skills.tools,
    ...profile.experience.slice(0, 2).map((e) => `${e.role} at ${e.company}`),
  ].join(" ");

  let embedding: number[] | null = null;
  try {
    embedding = await generateEmbedding(embeddingText);
  } catch (err) {
    console.error("Embedding error:", err);
    // Si falla el embedding, continuamos sin él (el matching semántico quedará deshabilitado)
  }

  // Guardar perfil estructurado en BD
  const { data: updated, error: updateError } = await serviceClient
    .from("resumes")
    .update({
      structured: profile,
      raw_text: isPdf ? null : embeddingText,
      ats_score: profile.diagnosis.ats_score,
      diagnosis: profile.diagnosis,
      embedding: embedding,
    })
    .eq("id", resume_id)
    .select()
    .single();

  if (updateError) {
    console.error("Update error:", updateError);
    return NextResponse.json({ error: "Error al guardar el análisis" }, { status: 500 });
  }

  return NextResponse.json({
    profile,
    ats_score: profile.diagnosis.ats_score,
    top_3_priorities: profile.diagnosis.top_3_priorities,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { searchAllSources } from "@/lib/jobs/aggregator";
import { getGeminiClient, GEMINI_MODELS } from "@/lib/gemini/client";
import { Resend } from "resend";

// Califica el match perfil↔vacante con Gemini Flash-Lite (barato, JSON estructurado)
async function scoreJobMatch(
  targetRole: string,
  skills: string,
  jobTitle: string,
  company: string
): Promise<{ score: number; reason: string }> {
  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model: GEMINI_MODELS.cheap,
    contents: `Califica del 0-100 qué tan bien encaja este perfil con la vacante.

PERFIL: ${targetRole}, skills: ${skills}
VACANTE: ${jobTitle} en ${company}`,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: {
          score: { type: "number" },
          reason: { type: "string" },
        },
        required: ["score", "reason"],
      },
      maxOutputTokens: 200,
    },
  });
  return JSON.parse(response.text ?? '{"score":0,"reason":""}');
}

// Protección del cron con secret
function verifyCronSecret(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const serviceClient = await createServiceClient();
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Obtener usuarios activos con perfil completo
  const { data: activeProfiles } = await serviceClient
    .from("profiles")
    .select("*")
    .eq("onboarding_complete", true);

  if (!activeProfiles || activeProfiles.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let totalAlerts = 0;

  for (const profile of activeProfiles) {
    try {
      // Buscar nuevas vacantes para este usuario
      const jobs = await searchAllSources({
        query: profile.target_role ?? "",
        location: profile.location ?? "",
        lat: profile.lat,
        lng: profile.lng,
        radius_km: profile.search_radius_km ?? 25,
        remote_ok: profile.remote_ok ?? true,
        limit: 10,
      });

      if (jobs.length === 0) continue;

      // Guardar vacantes nuevas
      await serviceClient.from("jobs").upsert(jobs, {
        onConflict: "external_id",
        ignoreDuplicates: true,
      });

      // Obtener IDs de las vacantes guardadas
      const { data: savedJobs } = await serviceClient
        .from("jobs")
        .select("id, title, company, url")
        .in("external_id", jobs.map((j) => j.external_id));

      if (!savedJobs || savedJobs.length === 0) continue;

      // Scoring con Batches API (50% descuento, no sensible a latencia)
      const { data: userResume } = await serviceClient
        .from("resumes")
        .select("structured")
        .eq("user_id", profile.id)
        .in("kind", ["optimized", "original"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!userResume?.structured) continue;

      const skills = userResume.structured.skills?.hard?.slice(0, 5).join(", ") ?? "";

      // Scoring de cada vacante en paralelo con Gemini Flash-Lite (económico)
      const scored = await Promise.all(
        savedJobs.map(async (job) => {
          try {
            const result = await scoreJobMatch(
              profile.target_role ?? "",
              skills,
              job.title,
              job.company
            );
            return { job, score: result.score, reason: result.reason };
          } catch {
            return null;
          }
        })
      );

      // Filtrar matches con score ≥ 75 y persistirlos
      const highMatches: Array<{ job: typeof savedJobs[0]; score: number; reason: string }> = [];

      for (const item of scored) {
        if (item && item.score >= 75) {
          highMatches.push(item);
          await serviceClient.from("job_matches").upsert(
            {
              user_id: profile.id,
              job_id: item.job.id,
              match_score: item.score,
              match_reasons: { reason: item.reason },
              notified_at: new Date().toISOString(),
            },
            { onConflict: "user_id,job_id" }
          );
        }
      }

      // Enviar email si hay matches con score ≥ 75
      if (highMatches.length > 0) {
        const { data: authUser } = await serviceClient.auth.admin.getUserById(profile.id as string);
        const userEmail = authUser.user?.email;
        if (userEmail) {
          await resend.emails.send({
            from: "CareerPilot <alertas@careerpilot.app>",
            to: userEmail,
            subject: `${highMatches.length} nueva${highMatches.length > 1 ? "s" : ""} vacante${highMatches.length > 1 ? "s" : ""} que encajan con tu perfil`,
            html: buildAlertEmail(highMatches, profile.target_role ?? ""),
          });
          totalAlerts += highMatches.length;
        }
      }
    } catch (err) {
      console.error(`Error procesando usuario ${profile.id}:`, err);
    }
  }

  return NextResponse.json({ processed: activeProfiles.length, alerts_sent: totalAlerts });
}

function buildAlertEmail(
  matches: Array<{ job: { title: string; company: string; url: string }; score: number; reason: string }>,
  targetRole: string
): string {
  const items = matches
    .map(
      ({ job, score, reason }) => `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px;">
      <h3 style="margin:0 0 4px;font-size:16px;">${job.title} — ${job.company}</h3>
      <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Match: ${score}/100 · ${reason}</p>
      <a href="${job.url}" style="background:#2563eb;color:white;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:14px;">Ver vacante</a>
    </div>`
    )
    .join("");

  return `
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
    <h2>Nuevas vacantes para ti — ${targetRole}</h2>
    <p>Encontramos vacantes con alta compatibilidad con tu perfil:</p>
    ${items}
    <p style="color:#6b7280;font-size:12px;margin-top:24px;">
      CareerPilot · <a href="#">Configurar frecuencia de alertas</a> · <a href="#">Darse de baja</a>
    </p>
  </div>`;
}

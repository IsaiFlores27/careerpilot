import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { generateText } from "@/lib/gemini/generate";
import { GEMINI_MODELS } from "@/lib/gemini/client";

function verifyCronSecret(request: NextRequest): boolean {
  return request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const serviceClient = await createServiceClient();
  const resend = new Resend(process.env.RESEND_API_KEY);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: activeProfiles } = await serviceClient
    .from("profiles")
    .select("id, target_role, location")
    .eq("onboarding_complete", true);

  if (!activeProfiles) return NextResponse.json({ sent: 0 });

  let sent = 0;

  for (const profile of activeProfiles) {
    try {
      // Estadísticas de la semana
      const [applicationsResult, interviewsResult, matchesResult] = await Promise.all([
        serviceClient
          .from("applications")
          .select("status, applied_at")
          .eq("user_id", profile.id)
          .gte("applied_at", weekAgo.toISOString()),
        serviceClient
          .from("applications")
          .select("id")
          .eq("user_id", profile.id)
          .eq("status", "interview"),
        serviceClient
          .from("job_matches")
          .select("id, match_score")
          .eq("user_id", profile.id)
          .gte("notified_at", weekAgo.toISOString()),
      ]);

      const stats = {
        applications_this_week: applicationsResult.data?.length ?? 0,
        interviews_scheduled: interviewsResult.data?.length ?? 0,
        new_matches: matchesResult.data?.length ?? 0,
        avg_match_score:
          matchesResult.data && matchesResult.data.length > 0
            ? Math.round(
                matchesResult.data.reduce((acc, m) => acc + (m.match_score ?? 0), 0) /
                  matchesResult.data.length
              )
            : 0,
      };

      // Generar resumen y próximos pasos con Flash-Lite (económico)
      const summary = await generateText({
        model: GEMINI_MODELS.cheap,
        maxOutputTokens: 600,
        prompt: `Genera un resumen semanal de búsqueda de empleo conciso y motivador (máximo 200 palabras) para alguien que busca "${profile.target_role}" en ${profile.location}.

ESTADÍSTICAS DE LA SEMANA:
- Postulaciones enviadas: ${stats.applications_this_week}
- Entrevistas activas: ${stats.interviews_scheduled}
- Nuevas vacantes que hacen match: ${stats.new_matches}
- Score promedio de matches: ${stats.avg_match_score}/100

Incluye:
1. Análisis breve del progreso (¿va bien, hay que acelerar?)
2. Top 2 acciones concretas para la próxima semana
3. Un mensaje motivador corto y específico (no genérico)`,
      });

      if (!summary) continue;

      const { data: authUser } = await serviceClient.auth.admin.getUserById(profile.id);
      const email = authUser.user?.email;
      if (!email) continue;

      await resend.emails.send({
        from: "CareerPilot <reports@careerpilot.app>",
        to: email,
        subject: `Tu resumen semanal — ${stats.applications_this_week} postulaciones, ${stats.interviews_scheduled} entrevistas`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2>📊 Tu semana en CareerPilot</h2>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0;">
              <div style="background:#eff6ff;border-radius:8px;padding:16px;text-align:center;">
                <div style="font-size:32px;font-weight:bold;color:#2563eb;">${stats.applications_this_week}</div>
                <div style="color:#6b7280;font-size:14px;">Postulaciones</div>
              </div>
              <div style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
                <div style="font-size:32px;font-weight:bold;color:#16a34a;">${stats.interviews_scheduled}</div>
                <div style="color:#6b7280;font-size:14px;">Entrevistas activas</div>
              </div>
            </div>
            <div style="background:#f9fafb;border-radius:8px;padding:20px;white-space:pre-wrap;line-height:1.6;">
              ${summary.replace(/\n/g, "<br>")}
            </div>
            <div style="margin-top:20px;text-align:center;">
              <a href="${process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_APP_URL ?? "#" : "#"}/dashboard"
                 style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">
                Ver mi dashboard →
              </a>
            </div>
          </div>`,
      });

      sent++;
    } catch (err) {
      console.error(`Error generando reporte para ${profile.id}:`, err);
    }
  }

  return NextResponse.json({ sent });
}

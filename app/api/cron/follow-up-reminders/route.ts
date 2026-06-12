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

  // Buscar postulaciones que necesitan follow-up hoy
  const today = new Date().toISOString().split("T")[0];
  const { data: dueApplications } = await serviceClient
    .from("applications")
    .select(`
      id, user_id, status, notes, applied_at,
      jobs(title, company)
    `)
    .lte("next_follow_up_at", today)
    .in("status", ["applied", "follow_up"])
    .limit(50);

  if (!dueApplications || dueApplications.length === 0) {
    return NextResponse.json({ reminders_sent: 0 });
  }

  let sent = 0;

  for (const app of dueApplications) {
    try {
      const job = app.jobs as unknown as { title?: string; company?: string } | null;
      const companyName = job?.company ?? "la empresa";
      const jobTitle = job?.title ?? "el puesto";

      // Generar mensaje de follow-up personalizado con Flash-Lite (económico)
      const message = await generateText({
        model: GEMINI_MODELS.cheap,
        maxOutputTokens: 300,
        prompt: `Escribe un mensaje de seguimiento de máximo 50 palabras para enviar hoy sobre una postulación enviada el ${app.applied_at?.split("T")[0]}.
Puesto: ${jobTitle} en ${companyName}
Estado actual: ${app.status}
${app.notes ? `Notas: ${app.notes}` : ""}

Solo el texto del mensaje, listo para copiar.`,
      });

      if (!message) continue;

      // Obtener email del usuario
      const { data: authUser } = await serviceClient.auth.admin.getUserById(app.user_id);
      const email = authUser.user?.email;
      if (!email) continue;

      await resend.emails.send({
        from: "CareerPilot <reminders@careerpilot.app>",
        to: email,
        subject: `Recordatorio: Follow-up para ${jobTitle} en ${companyName}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h3>Es momento de hacer follow-up 📬</h3>
            <p>Han pasado los días acordados desde que aplicaste a <strong>${jobTitle}</strong> en <strong>${companyName}</strong>.</p>
            <div style="background:#f9fafb;border-left:4px solid #2563eb;padding:16px;border-radius:4px;margin:16px 0;">
              <p style="margin:0;font-style:italic;">"${message}"</p>
            </div>
            <p style="color:#6b7280;font-size:14px;">Copia este mensaje y envíalo vía LinkedIn o email al reclutador.</p>
          </div>`,
      });

      // Actualizar next_follow_up_at a +7 días y status a follow_up
      const nextFollowUp = new Date();
      nextFollowUp.setDate(nextFollowUp.getDate() + 7);

      await serviceClient
        .from("applications")
        .update({
          status: "follow_up",
          next_follow_up_at: nextFollowUp.toISOString(),
        })
        .eq("id", app.id);

      sent++;
    } catch (err) {
      console.error(`Error procesando app ${app.id}:`, err);
    }
  }

  return NextResponse.json({ reminders_sent: sent });
}

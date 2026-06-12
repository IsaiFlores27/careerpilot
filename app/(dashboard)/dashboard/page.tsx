import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [profileResult, resumeResult, applicationsResult, matchesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase.from("resumes").select("id, kind, ats_score, diagnosis, structured, created_at").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1).single(),
    supabase.from("applications").select("status").eq("user_id", user!.id),
    supabase.from("job_matches").select("match_score").eq("user_id", user!.id).eq("status", "suggested").gte("match_score", 70).limit(5),
  ]);

  const profile = profileResult.data;
  const resume = resumeResult.data;
  const applications = applicationsResult.data ?? [];
  const matches = matchesResult.data ?? [];

  const stats = {
    applications: applications.length,
    interviews: applications.filter((a) => a.status === "interview").length,
    offers: applications.filter((a) => a.status === "offer").length,
    pending_matches: matches.length,
  };

  const hasResume = !!resume?.structured;
  const atsScore = resume?.ats_score ?? 0;
  const firstName = profile?.full_name?.split(" ")[0] ?? null;

  const scoreColor = atsScore >= 70 ? "text-emerald-400" : atsScore >= 50 ? "text-amber-400" : "text-red-400";
  const scoreBg = atsScore >= 70 ? "from-emerald-500/10 to-transparent border-emerald-500/20" : atsScore >= 50 ? "from-amber-500/10 to-transparent border-amber-500/20" : "from-red-500/10 to-transparent border-red-500/20";

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          {firstName ? `Hola, ${firstName}` : "Bienvenido"} 👋
        </h1>
        <p className="text-white/40 mt-1 text-sm">
          {hasResume ? "Tu coach está listo. ¿Qué trabajamos hoy?" : "Sube tu CV para activar todas las funciones de IA."}
        </p>
      </div>

      {/* CTA si no hay CV */}
      {!hasResume && (
        <Link href="/cv" className="flex items-center gap-5 bg-gradient-to-r from-violet-600/20 to-indigo-600/10 border border-violet-500/30 rounded-2xl p-6 mb-8 hover:border-violet-500/50 hover:from-violet-600/30 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">Sube tu CV para empezar</p>
            <p className="text-sm text-white/50 mt-0.5">Análisis con IA, ATS Score y diagnóstico completo en segundos.</p>
          </div>
          <svg className="w-5 h-5 text-white/30 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}

      {/* Stats */}
      {hasResume && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className={`bg-gradient-to-br ${scoreBg} border rounded-2xl p-5`}>
            <p className="text-xs text-white/40 mb-2">ATS Score</p>
            <p className={`text-4xl font-bold ${scoreColor}`}>{atsScore}</p>
            <p className="text-xs text-white/30 mt-1">/ 100</p>
          </div>
          {[
            { label: "Postulaciones", value: stats.applications, color: "text-white" },
            { label: "Entrevistas", value: stats.interviews, color: "text-violet-400" },
            { label: "Vacantes nuevas", value: stats.pending_matches, color: "text-emerald-400" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/5 border border-white/5 rounded-2xl p-5">
              <p className="text-xs text-white/40 mb-2">{stat.label}</p>
              <p className={`text-4xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Prioridades del CV */}
      {resume?.diagnosis?.top_3_priorities && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-amber-300 text-sm">Top 3 mejoras de mayor impacto</h2>
            <Link href="/cv" className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
              Optimizar →
            </Link>
          </div>
          <ol className="space-y-3">
            {(resume.diagnosis.top_3_priorities as string[]).map((p, i) => (
              <li key={i} className="flex gap-3 text-sm text-white/70">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center shrink-0 font-bold">{i + 1}</span>
                {p}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Accesos rápidos */}
      <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">Accesos rápidos</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { href: "/cv", icon: "📄", title: "Mi CV", desc: "Versiones y diagnóstico ATS", accent: "hover:border-violet-500/40 hover:bg-violet-500/5" },
          { href: "/jobs", icon: "🔍", title: "Buscar vacantes", desc: "Google Search en tiempo real", accent: "hover:border-blue-500/40 hover:bg-blue-500/5" },
          { href: "/linkedin", icon: "💼", title: "Optimizar LinkedIn", desc: "Titular, Acerca de y aptitudes", accent: "hover:border-sky-500/40 hover:bg-sky-500/5" },
          { href: "/coach", icon: "🤖", title: "Coach IA", desc: "Plan, mensajes, entrevistas", accent: "hover:border-emerald-500/40 hover:bg-emerald-500/5" },
          { href: "/applications", icon: "📊", title: "Mi pipeline", desc: "Estado de postulaciones", accent: "hover:border-amber-500/40 hover:bg-amber-500/5" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`bg-white/5 border border-white/5 rounded-2xl p-5 transition-all ${item.accent} group`}
          >
            <span className="text-2xl">{item.icon}</span>
            <p className="font-medium text-sm text-white mt-3">{item.title}</p>
            <p className="text-xs text-white/40 mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

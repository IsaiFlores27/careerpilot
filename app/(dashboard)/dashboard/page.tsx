import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Cargar datos del usuario
  const [profileResult, resumeResult, applicationsResult, matchesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase
      .from("resumes")
      .select("id, kind, ats_score, diagnosis, structured, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("applications")
      .select("status")
      .eq("user_id", user!.id),
    supabase
      .from("job_matches")
      .select("match_score")
      .eq("user_id", user!.id)
      .eq("status", "suggested")
      .gte("match_score", 70)
      .limit(5),
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

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Hola{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {hasResume
            ? "Tu coach está listo. ¿Qué hacemos hoy?"
            : "Empieza subiendo tu CV para activar todas las funciones."}
        </p>
      </div>

      {/* CTA principal si no hay CV */}
      {!hasResume && (
        <Link
          href="/cv"
          className="block bg-blue-600 text-white rounded-xl p-6 mb-6 hover:bg-blue-700 transition-colors"
        >
          <div className="flex items-center gap-4">
            <span className="text-4xl">📄</span>
            <div>
              <p className="font-semibold text-lg">Sube tu CV para empezar</p>
              <p className="text-blue-100 text-sm mt-1">
                Analizamos tu CV con IA y te damos un diagnóstico completo en segundos.
              </p>
            </div>
            <span className="ml-auto text-2xl">→</span>
          </div>
        </Link>
      )}

      {/* Score card */}
      {hasResume && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">ATS Score</p>
            <p className={`text-3xl font-bold ${atsScore >= 70 ? "text-green-600" : atsScore >= 50 ? "text-yellow-600" : "text-red-600"}`}>
              {atsScore}
            </p>
            <p className="text-xs text-gray-400 mt-1">/100</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Postulaciones</p>
            <p className="text-3xl font-bold text-gray-900">{stats.applications}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Entrevistas</p>
            <p className="text-3xl font-bold text-blue-600">{stats.interviews}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Nuevas vacantes</p>
            <p className="text-3xl font-bold text-green-600">{stats.pending_matches}</p>
          </div>
        </div>
      )}

      {/* Top 3 prioridades */}
      {resume?.diagnosis?.top_3_priorities && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-amber-900 mb-3">Top 3 prioridades para tu CV</h2>
          <ol className="space-y-2">
            {(resume.diagnosis.top_3_priorities as string[]).map((p, i) => (
              <li key={i} className="flex gap-3 text-sm text-amber-800">
                <span className="font-bold shrink-0">{i + 1}.</span>
                {p}
              </li>
            ))}
          </ol>
          <Link
            href="/cv"
            className="inline-block mt-4 bg-amber-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Optimizar CV ahora
          </Link>
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { href: "/cv", icon: "📄", title: "Mi CV", desc: "Versiones y diagnóstico" },
          { href: "/jobs", icon: "🔍", title: "Buscar vacantes", desc: "Con radio de búsqueda" },
          { href: "/linkedin", icon: "💼", title: "Optimizar LinkedIn", desc: "Titular y Acerca de" },
          { href: "/coach", icon: "🤖", title: "Chat coach", desc: "Plan, mensajes, prep" },
          { href: "/applications", icon: "📊", title: "Mi pipeline", desc: "Estado de postulaciones" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <span className="text-2xl">{item.icon}</span>
            <p className="font-medium text-sm mt-2">{item.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

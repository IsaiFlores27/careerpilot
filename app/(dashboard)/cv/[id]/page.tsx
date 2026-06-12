import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { OptimizeCvButton } from "@/components/cv/optimize-cv-button";
import { DownloadCvButton } from "@/components/cv/download-cv-button";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CvDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: resume, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (error || !resume) notFound();

  const profile = resume.structured;
  const diagnosis = resume.diagnosis;
  const score = resume.ats_score ?? 0;

  const scoreColor = score >= 70 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  const scoreBg = score >= 70 ? "from-emerald-500/10 border-emerald-500/20" : score >= 50 ? "from-amber-500/10 border-amber-500/20" : "from-red-500/10 border-red-500/20";
  const scoreLabel = score >= 70 ? "Excelente" : score >= 50 ? "Mejorable" : "Crítico";

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/cv" className="text-white/30 hover:text-white/60 transition-colors">Mi CV</Link>
        <span className="text-white/20">/</span>
        <span className="text-white/60 capitalize">{resume.kind}</span>
      </div>

      {/* Score card */}
      <div className={`bg-gradient-to-r ${scoreBg} to-transparent border rounded-2xl p-6 mb-6 flex items-center justify-between`}>
        <div>
          <p className="text-xs text-white/40 mb-1">ATS Score</p>
          <div className="flex items-end gap-2">
            <span className={`text-5xl font-bold ${scoreColor}`}>{score}</span>
            <span className="text-white/30 text-lg mb-1">/100</span>
          </div>
          <p className={`text-sm mt-1 ${scoreColor} opacity-80`}>{scoreLabel}</p>
          {diagnosis?.overall_assessment && (
            <p className="text-xs text-white/40 mt-1 max-w-sm">{diagnosis.overall_assessment}</p>
          )}
        </div>
        <div className="flex gap-3">
          <DownloadCvButton resumeId={id} />
          {resume.kind !== "tailored" && <OptimizeCvButton resumeId={id} />}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top 3 prioridades */}
        {diagnosis?.top_3_priorities && (
          <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
            <h2 className="font-semibold text-white mb-4 text-sm">Top 3 mejoras de mayor impacto</h2>
            <ol className="space-y-3">
              {diagnosis.top_3_priorities.map((p: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm text-white/70">
                  <span className="w-5 h-5 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-400 text-xs flex items-center justify-center shrink-0 font-bold">
                    {i + 1}
                  </span>
                  {p}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Bullets débiles */}
        {diagnosis?.weak_bullets?.length > 0 && (
          <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
            <h2 className="font-semibold text-white mb-4 text-sm">Bullets que necesitan mejora</h2>
            <div className="space-y-4">
              {diagnosis.weak_bullets.slice(0, 3).map(
                (b: { original: string; problem: string; suggestion: string }, i: number) => (
                  <div key={i} className="text-sm border-l-2 border-white/10 pl-3">
                    <p className="text-red-400/70 line-through text-xs">{b.original}</p>
                    <p className="text-white/30 text-xs mt-0.5">{b.problem}</p>
                    <p className="text-emerald-400/80 mt-1 text-xs">→ {b.suggestion}</p>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* Perfil estructurado */}
      {profile && (
        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 mt-4">
          <h2 className="font-semibold text-white mb-5 text-sm">Perfil extraído</h2>

          <div className="mb-5">
            <p className="font-semibold text-white">{profile.contact?.name}</p>
            <p className="text-sm text-white/50 mt-0.5">{profile.headline}</p>
            <div className="flex gap-4 mt-2 flex-wrap">
              {profile.contact?.email && (
                <span className="text-xs text-white/30">{profile.contact.email}</span>
              )}
              {profile.contact?.location && (
                <span className="text-xs text-white/30">📍 {profile.contact.location}</span>
              )}
            </div>
          </div>

          {profile.skills && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">Habilidades</p>
              <div className="flex flex-wrap gap-1.5">
                {[...profile.skills.hard, ...profile.skills.tools].map((s: string, i: number) => (
                  <span key={i} className="bg-white/5 border border-white/10 text-white/60 text-xs px-2.5 py-1 rounded-lg">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {profile.experience?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Experiencia</p>
              <div className="space-y-3">
                {profile.experience.slice(0, 3).map(
                  (exp: { company: string; role: string; start: string; end?: string; current?: boolean }, i: number) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-white">{exp.role}</p>
                        <p className="text-xs text-white/40">
                          {exp.company} · {exp.start} – {exp.current ? "Presente" : exp.end ?? ""}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

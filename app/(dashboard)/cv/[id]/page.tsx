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

  const scoreColor =
    resume.ats_score >= 70 ? "text-green-600" : resume.ats_score >= 50 ? "text-yellow-600" : "text-red-600";
  const scoreBg =
    resume.ats_score >= 70 ? "bg-green-50 border-green-200" : resume.ats_score >= 50 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/cv" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Mis CVs
        </Link>
        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
          {resume.kind}
        </span>
      </div>

      {/* Header con score */}
      <div className={`rounded-xl border p-5 mb-6 ${scoreBg}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">ATS Score</p>
            <p className={`text-5xl font-bold mt-1 ${scoreColor}`}>{resume.ats_score}</p>
            <p className="text-xs text-gray-500 mt-1">/100 — {diagnosis?.overall_assessment}</p>
          </div>
          <div className="flex gap-2">
            <DownloadCvButton resumeId={id} />
            {resume.kind !== "tailored" && (
              <OptimizeCvButton resumeId={id} />
            )}
          </div>
        </div>
      </div>

      {/* Top 3 prioridades */}
      {diagnosis?.top_3_priorities && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">Top 3 mejoras de mayor impacto</h2>
          <ol className="space-y-2">
            {diagnosis.top_3_priorities.map((p: string, i: number) => (
              <li key={i} className="flex gap-3 text-sm text-gray-700">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">
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
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">Bullets que necesitan mejora</h2>
          <div className="space-y-3">
            {diagnosis.weak_bullets.slice(0, 5).map(
              (b: { original: string; problem: string; suggestion: string }, i: number) => (
                <div key={i} className="text-sm">
                  <p className="text-red-600 line-through">{b.original}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Problema: {b.problem}</p>
                  <p className="text-green-700 mt-1">→ {b.suggestion}</p>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Perfil estructurado */}
      {profile && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Perfil extraído</h2>

          {/* Contacto */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Contacto</h3>
            <p className="font-semibold">{profile.contact?.name}</p>
            <p className="text-sm text-gray-500">{profile.headline}</p>
            <div className="flex gap-3 mt-1">
              {profile.contact?.email && (
                <span className="text-xs text-gray-400">{profile.contact.email}</span>
              )}
              {profile.contact?.location && (
                <span className="text-xs text-gray-400">📍 {profile.contact.location}</span>
              )}
            </div>
          </div>

          {/* Skills */}
          {profile.skills && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Habilidades</h3>
              <div className="flex flex-wrap gap-1.5">
                {[...profile.skills.hard, ...profile.skills.tools].map((s: string, i: number) => (
                  <span key={i} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Experiencia */}
          {profile.experience?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Experiencia</h3>
              <div className="space-y-3">
                {profile.experience.slice(0, 3).map(
                  (exp: { company: string; role: string; start: string; end?: string; current?: boolean; bullets: string[] }, i: number) => (
                    <div key={i}>
                      <p className="font-medium text-sm">{exp.role}</p>
                      <p className="text-xs text-gray-500">
                        {exp.company} · {exp.start} – {exp.current ? "Presente" : exp.end ?? ""}
                      </p>
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

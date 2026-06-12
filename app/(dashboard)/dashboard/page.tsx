"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SkillRadar { label: string; score: number; }
interface Course { title: string; provider: string; reason: string; url: string; }
interface Insights {
  seniority: string;
  seniority_label: string;
  percentile: number;
  percentile_text: string;
  years_experience: number;
  radar: SkillRadar[];
  courses: Course[];
  strengths: string[];
  growth_areas: string[];
}
interface ScorePoint { kind: string; ats_score: number; created_at: string; }
interface Summary {
  full_name: string | null;
  target_role: string | null;
  resume_id: string | null;
  resume_kind: string | null;
  ats_score: number | null;
  top_3_priorities: string[] | null;
  score_history?: ScorePoint[];
  derived: {
    name: string | null;
    headline: string | null;
    skills_count: number;
    experience_count: number;
    languages_count: number;
    certifications_count: number;
    education_count: number;
  } | null;
  stats: { applications: number; interviews: number; offers: number; pending_matches: number; };
}

export default function DashboardPage() {
  const [summary, setSummary]   = useState<Summary | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loadingSummary, setLoadingSummary]   = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/summary")
      .then((r) => r.json())
      .then((d) => { setSummary(d); setLoadingSummary(false); })
      .catch(() => setLoadingSummary(false));

    fetch("/api/dashboard/insights")
      .then((r) => r.json())
      .then((d) => { setInsights(d.insights ?? null); setLoadingInsights(false); })
      .catch(() => setLoadingInsights(false));
  }, []);

  const firstName = summary?.full_name?.split(" ")[0] ?? summary?.derived?.name?.split(" ")[0] ?? null;
  const hasResume = !!summary?.derived;
  const atsScore  = summary?.ats_score ?? 0;

  if (loadingSummary) {
    return (
      <div>
        <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-72 bg-white/5 rounded-lg animate-pulse mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{firstName ? `Hola, ${firstName}` : "Bienvenido"} 👋</h1>
        <p className="text-white/40 mt-1 text-sm">
          {hasResume
            ? <>Análisis de <span className="text-violet-300">{summary?.derived?.headline ?? "tu CV activo"}</span></>
            : "Sube tu CV para activar todas las funciones de IA."}
        </p>
      </div>

      {/* Banner perfil incompleto */}
      {hasResume && summary && !summary.target_role && (
        <Link href="/profile" className="flex items-center gap-4 bg-violet-600/10 border border-violet-500/30 rounded-2xl p-4 mb-6 hover:border-violet-500/50 transition-all group">
          <svg className="w-5 h-5 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Completa tu perfil para mejores resultados</p>
            <p className="text-xs text-white/50 mt-0.5">Define tu rol objetivo y ubicación — las vacantes, el coach y LinkedIn serán mucho más precisos.</p>
          </div>
          <span className="text-xs text-violet-400 group-hover:translate-x-1 transition-transform shrink-0">Configurar →</span>
        </Link>
      )}

      {/* CTA si no hay CV */}
      {!hasResume && (
        <Link href="/cv" className="flex items-center gap-5 bg-gradient-to-r from-violet-600/20 to-indigo-600/10 border border-violet-500/30 rounded-2xl p-6 mb-8 hover:border-violet-500/50 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">Sube tu CV para empezar</p>
            <p className="text-sm text-white/50 mt-0.5">Análisis con IA, ATS Score y diagnóstico completo en segundos.</p>
          </div>
        </Link>
      )}

      {hasResume && summary && (
        <>
          {/* Fila superior: gauge ATS + nivel/percentil + métricas */}
          <div className="grid gap-4 lg:grid-cols-3 mb-4">
            {/* ATS gauge */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 flex items-center gap-5">
              <AtsGauge score={atsScore} />
              <div>
                <p className="text-xs text-white/40 mb-1">ATS Score</p>
                <p className="text-sm text-white/70 leading-snug">
                  {atsScore >= 70 ? "Tu CV pasa bien los filtros automáticos." : atsScore >= 50 ? "Mejorable: optimiza para subir." : "Crítico: necesita optimización."}
                </p>
                <Link href={summary.resume_id ? `/cv/${summary.resume_id}` : "/cv"} className="text-xs text-violet-400 hover:text-violet-300 mt-2 inline-block">Ver diagnóstico →</Link>
              </div>
            </div>

            {/* Nivel + percentil */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 lg:col-span-2">
              {loadingInsights ? (
                <InsightsLoading />
              ) : insights ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-white/40">Tu nivel profesional</p>
                      <p className="text-xl font-bold text-white mt-0.5">{insights.seniority_label}
                        <span className="text-sm font-normal text-white/40 ml-2">· {insights.years_experience} años exp.</span>
                      </p>
                    </div>
                    <span className="text-3xl font-bold text-violet-400">Top {100 - insights.percentile}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden mb-2">
                    <div className="h-2.5 bg-gradient-to-r from-violet-600 to-indigo-400 rounded-full transition-all duration-1000" style={{ width: `${insights.percentile}%` }} />
                  </div>
                  <p className="text-xs text-white/50">{insights.percentile_text}</p>
                </div>
              ) : (
                <p className="text-sm text-white/40 self-center">No se pudo generar el análisis avanzado. Recarga para reintentar.</p>
              )}
            </div>
          </div>

          {/* Métricas derivadas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            {[
              { label: "Postulaciones", value: summary.stats.applications, color: "text-white" },
              { label: "Entrevistas", value: summary.stats.interviews, color: "text-violet-400" },
              { label: "Vacantes nuevas", value: summary.stats.pending_matches, color: "text-emerald-400" },
              { label: "Habilidades", value: summary.derived!.skills_count, color: "text-sky-400" },
              { label: "Certificaciones", value: summary.derived!.certifications_count, color: "text-amber-400" },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/5 rounded-2xl p-4">
                <p className="text-xs text-white/40 mb-1.5">{s.label}</p>
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Evolución del ATS Score */}
          {(summary.score_history?.length ?? 0) >= 2 && (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-white/70">Evolución de tu ATS Score</p>
                <p className="text-xs text-white/35">
                  {summary.score_history![0].ats_score} → <span className="text-emerald-400 font-semibold">{summary.score_history![summary.score_history!.length - 1].ats_score}</span>
                </p>
              </div>
              <ScoreHistory data={summary.score_history!} />
            </div>
          )}

          {/* Radar + fortalezas/mejoras */}
          {!loadingInsights && insights && (
            <div className="grid gap-4 lg:grid-cols-3 mb-8">
              <div className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col items-center">
                <p className="text-sm font-medium text-white/70 self-start mb-2">Radar de competencias</p>
                <RadarChart data={insights.radar} />
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-6 lg:col-span-2 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-emerald-400 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Fortalezas
                  </p>
                  <ul className="space-y-2.5">
                    {insights.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-white/70 flex gap-2"><span className="text-emerald-400/60">✓</span>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Áreas de crecimiento
                  </p>
                  <ul className="space-y-2.5">
                    {insights.growth_areas.map((s, i) => (
                      <li key={i} className="text-sm text-white/70 flex gap-2"><span className="text-amber-400/60">↗</span>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Cursos recomendados */}
          {!loadingInsights && insights && insights.courses.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">Cursos para cerrar tus brechas</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {insights.courses.map((c, i) => (
                  <a key={i} href={c.url} target="_blank" rel="noopener noreferrer"
                     className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:border-sky-500/40 hover:bg-sky-500/5 transition-all group">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white text-sm leading-snug">{c.title}</p>
                        <p className="text-xs text-sky-400 mt-1">{c.provider}</p>
                      </div>
                      <svg className="w-4 h-4 text-white/20 group-hover:text-sky-400 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                    <p className="text-xs text-white/40 mt-2 leading-relaxed">{c.reason}</p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {loadingInsights && (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 mb-8 flex items-center gap-3">
              <SpinIcon />
              <p className="text-sm text-white/50">Generando tu análisis de carrera con IA…</p>
            </div>
          )}

          {/* Prioridades del CV */}
          {summary.top_3_priorities && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-amber-300 text-sm">Top 3 mejoras de mayor impacto</h2>
                <Link href={summary.resume_id ? `/cv/${summary.resume_id}` : "/cv"} className="text-xs text-amber-400 hover:text-amber-300">Optimizar →</Link>
              </div>
              <ol className="space-y-3">
                {summary.top_3_priorities.map((p, i) => (
                  <li key={i} className="flex gap-3 text-sm text-white/70">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center shrink-0 font-bold">{i + 1}</span>{p}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}

      {/* Accesos rápidos */}
      <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">Accesos rápidos</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { href: "/cv", icon: "📄", title: "Mi CV", desc: "Versiones y diagnóstico ATS", accent: "hover:border-violet-500/40 hover:bg-violet-500/5" },
          { href: "/jobs", icon: "🔍", title: "Buscar vacantes", desc: "Vacantes acordes a tu perfil", accent: "hover:border-blue-500/40 hover:bg-blue-500/5" },
          { href: "/linkedin", icon: "💼", title: "Optimizar LinkedIn", desc: "Titular, Acerca de y aptitudes", accent: "hover:border-sky-500/40 hover:bg-sky-500/5" },
          { href: "/coach", icon: "🤖", title: "Coach IA", desc: "Plan, mensajes, entrevistas", accent: "hover:border-emerald-500/40 hover:bg-emerald-500/5" },
          { href: "/applications", icon: "📊", title: "Mi pipeline", desc: "Estado de postulaciones", accent: "hover:border-amber-500/40 hover:bg-amber-500/5" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className={`bg-white/5 border border-white/5 rounded-2xl p-5 transition-all ${item.accent}`}>
            <span className="text-2xl">{item.icon}</span>
            <p className="font-medium text-sm text-white mt-3">{item.title}</p>
            <p className="text-xs text-white/40 mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── ATS gauge (circular SVG) ──────────────────────────────────────────────
function AtsGauge({ score }: { score: number }) {
  const r = 34, c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score));
  const dash = (pct / 100) * c;
  const color = score >= 70 ? "#34d399" : score >= 50 ? "#fbbf24" : "#f87171";
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
      <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`} transform="rotate(-90 44 44)" style={{ transition: "stroke-dasharray 1s ease-out" }} />
      <text x="44" y="44" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="22" fontWeight="bold">{score}</text>
      <text x="44" y="60" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">/ 100</text>
    </svg>
  );
}

// ── Radar chart (pentagon SVG) ────────────────────────────────────────────
function RadarChart({ data }: { data: SkillRadar[] }) {
  const size = 220, cx = size / 2, cy = size / 2, maxR = 78;
  const n = data.length;
  if (n < 3) return <p className="text-xs text-white/30">Datos insuficientes</p>;

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, rNorm: number) => {
    const a = angle(i);
    return [cx + Math.cos(a) * maxR * rNorm, cy + Math.sin(a) * maxR * rNorm];
  };

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1].map((rn) =>
    data.map((_, i) => point(i, rn).join(",")).join(" ")
  );
  // Data polygon
  const dataPts = data.map((d, i) => point(i, Math.min(1, d.score / 100)).join(",")).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      ))}
      {data.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
      })}
      <polygon points={dataPts} fill="rgba(124,58,237,0.25)" stroke="#7c3aed" strokeWidth="2" />
      {data.map((d, i) => {
        const [x, y] = point(i, Math.min(1, d.score / 100));
        return <circle key={i} cx={x} cy={y} r="3" fill="#a78bfa" />;
      })}
      {data.map((d, i) => {
        const [x, y] = point(i, 1.18);
        return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="rgba(255,255,255,0.5)" fontSize="9">{d.label}</text>;
      })}
    </svg>
  );
}

// ── Historial de ATS Score (barras SVG) ───────────────────────────────────
function ScoreHistory({ data }: { data: ScorePoint[] }) {
  const kindLabel: Record<string, string> = { original: "Original", optimized: "Optimizado", tailored: "Adaptado" };
  const w = 640, h = 120, gap = 10;
  const barW = Math.min(56, (w - gap * (data.length + 1)) / data.length);
  const color = (s: number) => s >= 70 ? "#34d399" : s >= 50 ? "#fbbf24" : "#f87171";
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h + 36}`} className="w-full" style={{ minWidth: data.length * 70 }}>
        {data.map((p, i) => {
          const x = gap + i * (barW + gap);
          const barH = Math.max(6, (p.ats_score / 100) * h);
          return (
            <g key={i}>
              <rect x={x} y={h - barH} width={barW} height={barH} rx={6} fill={color(p.ats_score)} opacity={0.85} />
              <text x={x + barW / 2} y={h - barH - 6} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">{p.ats_score}</text>
              <text x={x + barW / 2} y={h + 14} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">
                {kindLabel[p.kind] ?? p.kind}
              </text>
              <text x={x + barW / 2} y={h + 27} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="8">
                {new Date(p.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function InsightsLoading() {
  return (
    <div className="flex items-center gap-3 h-full">
      <SpinIcon />
      <p className="text-sm text-white/40">Calculando tu nivel profesional…</p>
    </div>
  );
}

function SpinIcon() {
  return (
    <svg className="w-5 h-5 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

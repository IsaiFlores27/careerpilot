"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  seven_day_plan: { label: "Plan de 7 días",          icon: "🗓️", color: "border-violet-500/20 bg-violet-500/5" },
  cold_message:   { label: "Mensaje en frío",          icon: "✉️", color: "border-blue-500/20 bg-blue-500/5" },
  cover_letter:   { label: "Carta de presentación",    icon: "📝", color: "border-emerald-500/20 bg-emerald-500/5" },
  interview_prep: { label: "Preparación de entrevista", icon: "🎤", color: "border-amber-500/20 bg-amber-500/5" },
  follow_up:      { label: "Mensaje de seguimiento",   icon: "🔔", color: "border-sky-500/20 bg-sky-500/5" },
};

interface Artifact {
  id: string;
  type: string;
  content: { input?: Record<string, unknown>; result?: string };
  created_at: string;
}

export default function DocumentsPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/coach/artifacts")
      .then((r) => r.json())
      .then((d) => setArtifacts(d.artifacts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function copy(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function artifactSubtitle(a: Artifact): string {
    const i = a.content?.input ?? {};
    const parts = [i.company, i.job_title].filter(Boolean);
    return parts.length ? String(parts.join(" · ")) : "";
  }

  const visible = filter === "all" ? artifacts : artifacts.filter((a) => a.type === filter);
  const types = Array.from(new Set(artifacts.map((a) => a.type)));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Mis documentos</h1>
        <p className="text-white/40 text-sm mt-1">
          Todo lo que el Coach IA genera para ti se guarda aquí: cartas, mensajes, planes y preparaciones.
        </p>
      </div>

      {/* Filtros */}
      {artifacts.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`text-xs px-3.5 py-2 rounded-xl border transition-all ${
              filter === "all" ? "bg-violet-600/20 border-violet-500/40 text-violet-300" : "border-white/10 text-white/40 hover:text-white/70"
            }`}
          >
            Todos ({artifacts.length})
          </button>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-xs px-3.5 py-2 rounded-xl border transition-all ${
                filter === t ? "bg-violet-600/20 border-violet-500/40 text-violet-300" : "border-white/10 text-white/40 hover:text-white/70"
              }`}
            >
              {TYPE_CONFIG[t]?.icon} {TYPE_CONFIG[t]?.label ?? t} ({artifacts.filter((a) => a.type === t).length})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />)}</div>
      ) : artifacts.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-white/40 font-medium">Aún no tienes documentos</p>
          <p className="text-white/25 text-sm mt-1 mb-5">Pídele al coach una carta de presentación, un plan de búsqueda o una prep de entrevista.</p>
          <Link href="/coach" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm px-5 py-2.5 rounded-xl transition-all">
            Ir al Coach IA →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((a) => {
            const cfg = TYPE_CONFIG[a.type] ?? { label: a.type, icon: "📄", color: "border-white/10 bg-white/5" };
            const isExpanded = expanded === a.id;
            const text = a.content?.result ?? "";
            const subtitle = artifactSubtitle(a);
            return (
              <div key={a.id} className={`border rounded-2xl transition-all ${cfg.color}`}>
                <button
                  onClick={() => setExpanded(isExpanded ? null : a.id)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-xl shrink-0">{cfg.icon}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-white">{cfg.label}</p>
                      <p className="text-xs text-white/40 mt-0.5 truncate">
                        {subtitle ? `${subtitle} · ` : ""}
                        {new Date(a.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <svg className={`w-4 h-4 text-white/25 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-white/5 pt-4">
                    <pre className="text-sm text-white/75 whitespace-pre-wrap font-sans leading-relaxed max-h-96 overflow-y-auto">{text}</pre>
                    <button
                      onClick={() => copy(a.id, text)}
                      className="mt-4 flex items-center gap-2 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-4 py-2 rounded-lg transition-all"
                    >
                      {copied === a.id ? "✓ Copiado" : "Copiar texto"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

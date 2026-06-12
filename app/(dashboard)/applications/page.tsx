"use client";

import { useState, useEffect } from "react";

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  applied:   { label: "Aplicado",   dot: "bg-blue-500",    badge: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
  follow_up: { label: "Follow-up",  dot: "bg-amber-500",   badge: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
  interview: { label: "Entrevista", dot: "bg-violet-500",  badge: "bg-violet-500/10 border-violet-500/20 text-violet-400" },
  offer:     { label: "Oferta",     dot: "bg-emerald-500", badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
  rejected:  { label: "Rechazado",  dot: "bg-red-500",     badge: "bg-red-500/10 border-red-500/20 text-red-400" },
};
const STATUS_ORDER = ["interview", "follow_up", "applied", "offer", "rejected"] as const;

interface AppRow {
  id: string;
  status: string;
  applied_at: string;
  next_follow_up_at: string | null;
  notes: string | null;
  job_id: string | null;
  jobs: { title?: string; company?: string; location?: string; url?: string } | null;
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Formulario de alta manual
  const [form, setForm] = useState({ title: "", company: "", location: "", url: "", notes: "", status: "applied" });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then((d) => setApps(d.applications ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  async function patchApp(id: string, updates: Record<string, unknown>, optimistic?: Partial<AppRow>) {
    setSaving(id);
    if (optimistic) {
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...optimistic } : a)));
    }
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) load(); // revertir si falló
    setSaving(null);
  }

  async function deleteApp(id: string) {
    setSaving(id);
    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
    if (res.ok) {
      setApps((prev) => prev.filter((a) => a.id !== id));
      setToast("Postulación eliminada");
    }
    setSaving(null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.company) return;
    setSubmitting(true);
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ title: "", company: "", location: "", url: "", notes: "", status: "applied" });
      setShowAdd(false);
      setToast("Postulación registrada ✓");
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      setToast(d.error ?? "Error al registrar");
    }
    setSubmitting(false);
  }

  const grouped = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = apps.filter((a) => a.status === s);
    return acc;
  }, {} as Record<string, AppRow[]>);

  const total = apps.length;
  const interviews = grouped["interview"].length + apps.filter(a => a.status === "offer").length; // ofertas pasaron por entrevista
  const offers = grouped["offer"].length;
  const conversionRate = total > 0 ? Math.round((interviews / total) * 100) : 0;

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pipeline de postulaciones</h1>
          <p className="text-white/40 text-sm mt-1">Registra cada vacante, actualiza el estado y nunca olvides un seguimiento.</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2.5 rounded-xl transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Registrar postulación
        </button>
      </div>

      {/* Formulario de alta */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white/5 border border-violet-500/20 rounded-2xl p-6 mb-8">
          <p className="text-sm font-medium text-white mb-4">Nueva postulación</p>
          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <input
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Puesto *" required
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-violet-500/50 focus:outline-none"
            />
            <input
              value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Empresa *" required
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-violet-500/50 focus:outline-none"
            />
            <input
              value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Ubicación"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-violet-500/50 focus:outline-none"
            />
            <input
              value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="URL de la vacante"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-violet-500/50 focus:outline-none"
            />
          </div>
          <textarea
            value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notas (contacto, salario ofrecido, cómo aplicaste...)"
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-violet-500/50 focus:outline-none mb-4"
          />
          <div className="flex items-center justify-between">
            <select
              value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="bg-[#1a1d2e] border border-white/10 rounded-xl px-3 py-2 text-sm text-white/80 focus:outline-none"
            >
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="text-sm text-white/40 hover:text-white/70 px-4 py-2 transition-colors">Cancelar</button>
              <button
                type="submit" disabled={submitting || !form.title || !form.company}
                className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-5 py-2 rounded-xl transition-all disabled:opacity-40"
              >
                {submitting ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Postulaciones", value: total, color: "text-white" },
          { label: "Entrevistas", value: grouped["interview"].length, color: "text-violet-400" },
          { label: "Ofertas", value: offers, color: "text-emerald-400" },
          { label: "Tasa entrevistas", value: `${conversionRate}%`, color: "text-blue-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/5 border border-white/5 rounded-2xl p-5">
            <p className="text-xs text-white/40 mb-2">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}</div>
      ) : total === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-white/40 font-medium">Sin postulaciones aún</p>
          <p className="text-white/25 text-sm mt-1">Postúlate desde Vacantes con &quot;Me postulé&quot; o registra una manualmente.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {STATUS_ORDER.map((status) => {
            const list = grouped[status];
            if (list.length === 0) return null;
            const cfg = STATUS_CONFIG[status];
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                    {cfg.label} <span className="text-white/25">({list.length})</span>
                  </h2>
                </div>
                <div className="space-y-2">
                  {list.map((app) => {
                    const job = app.jobs;
                    const isExpanded = expanded === app.id;
                    const isSaving = saving === app.id;
                    return (
                      <div key={app.id} className="bg-white/5 border border-white/5 rounded-xl hover:border-white/10 transition-all">
                        {/* Fila principal */}
                        <div className="px-5 py-4 flex items-center justify-between gap-4 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : app.id)}>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-white truncate">{job?.title ?? "Vacante"}</p>
                            <p className="text-xs text-white/40 mt-0.5">
                              {job?.company}{job?.location ? ` · ${job.location}` : ""} · {new Date(app.applied_at).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                            </p>
                            {app.next_follow_up_at && (
                              <p className={`text-xs mt-1 ${new Date(app.next_follow_up_at) <= new Date() ? "text-red-400" : "text-amber-400/70"}`}>
                                {new Date(app.next_follow_up_at) <= new Date() ? "⚠ Seguimiento pendiente: " : "Seguimiento: "}
                                {new Date(app.next_follow_up_at).toLocaleDateString("es-MX")}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {/* Selector de estado */}
                            <select
                              value={app.status}
                              disabled={isSaving}
                              onChange={(e) => patchApp(app.id, { status: e.target.value }, { status: e.target.value })}
                              className={`text-xs px-2.5 py-1.5 rounded-lg border bg-[#13151f] cursor-pointer focus:outline-none ${STATUS_CONFIG[app.status]?.badge ?? ""}`}
                            >
                              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                            <svg className={`w-4 h-4 text-white/25 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} onClick={() => setExpanded(isExpanded ? null : app.id)}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>

                        {/* Detalle expandible */}
                        {isExpanded && (
                          <div className="px-5 pb-4 pt-1 border-t border-white/5 space-y-3">
                            <div>
                              <label className="text-xs text-white/35 block mb-1.5">Notas</label>
                              <textarea
                                defaultValue={app.notes ?? ""}
                                rows={2}
                                placeholder="Contacto, feedback de la entrevista, salario..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-violet-500/50 focus:outline-none"
                                onBlur={(e) => {
                                  if (e.target.value !== (app.notes ?? "")) {
                                    patchApp(app.id, { notes: e.target.value }, { notes: e.target.value });
                                  }
                                }}
                              />
                            </div>
                            <div className="flex items-end justify-between gap-3 flex-wrap">
                              <div>
                                <label className="text-xs text-white/35 block mb-1.5">Próximo seguimiento</label>
                                <input
                                  type="date"
                                  defaultValue={app.next_follow_up_at ? app.next_follow_up_at.slice(0, 10) : ""}
                                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-violet-500/50 focus:outline-none [color-scheme:dark]"
                                  onChange={(e) => {
                                    const iso = e.target.value ? new Date(e.target.value + "T09:00:00").toISOString() : null;
                                    patchApp(app.id, { next_follow_up_at: iso }, { next_follow_up_at: iso });
                                  }}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                {job?.url && (
                                  <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-xs text-white/35 hover:text-white/70 px-3 py-2 transition-colors">
                                    Ver vacante →
                                  </a>
                                )}
                                <button
                                  onClick={() => deleteApp(app.id)}
                                  disabled={isSaving}
                                  className="flex items-center gap-1.5 text-xs text-white/25 hover:text-red-400 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-40"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1d2e] border border-white/15 text-white text-sm px-5 py-3 rounded-xl shadow-2xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

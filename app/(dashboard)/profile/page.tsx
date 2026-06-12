"use client";

import { useState, useEffect } from "react";

interface ProfileForm {
  full_name: string;
  target_role: string;
  target_industry: string;
  location: string;
  search_radius_km: number;
  remote_ok: boolean;
  salary_min: string;
}

export default function ProfilePage() {
  const [form, setForm] = useState<ProfileForm>({
    full_name: "", target_role: "", target_industry: "",
    location: "", search_radius_km: 25, remote_ok: true, salary_min: "",
  });
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setForm({
            full_name: d.profile.full_name ?? "",
            target_role: d.profile.target_role ?? "",
            target_industry: d.profile.target_industry ?? "",
            location: d.profile.location ?? "",
            search_radius_km: d.profile.search_radius_km ?? 25,
            remote_ok: d.profile.remote_ok ?? true,
            salary_min: d.profile.salary_min ? String(d.profile.salary_min) : "",
          });
        }
        setEmail(d.email ?? "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        search_radius_km: Number(form.search_radius_km),
      }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div>
        <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse mb-8" />
        <div className="h-96 bg-white/5 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const complete = !!form.target_role && !!form.location;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Mi perfil</h1>
        <p className="text-white/40 text-sm mt-1">
          Esta información alimenta la búsqueda de vacantes, el coach y la optimización de tu CV.
        </p>
      </div>

      {!complete && (
        <div className="bg-violet-600/10 border border-violet-500/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <svg className="w-5 h-5 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-violet-200">
            Completa tu <strong>rol objetivo</strong> y <strong>ubicación</strong> para que las vacantes y el coach sean mucho más precisos.
          </p>
        </div>
      )}

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-5">
          <div>
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-2">Nombre completo</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Tu nombre"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-violet-500/50 focus:outline-none"
            />
            <p className="text-xs text-white/25 mt-1.5">Cuenta: {email}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-2">
                Rol objetivo <span className="text-violet-400">*</span>
              </label>
              <input
                value={form.target_role}
                onChange={(e) => setForm({ ...form, target_role: e.target.value })}
                placeholder="Ej. QA Engineer, Analista de Calidad"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-violet-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-2">Industria objetivo</label>
              <input
                value={form.target_industry}
                onChange={(e) => setForm({ ...form, target_industry: e.target.value })}
                placeholder="Ej. Alimentos, Tecnología, Farma"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-violet-500/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-2">
                Ubicación <span className="text-violet-400">*</span>
              </label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Ej. Guadalajara, Jalisco"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-violet-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-2">
                Radio de búsqueda: <span className="text-violet-300">{form.search_radius_km} km</span>
              </label>
              <input
                type="range" min={5} max={100} step={5}
                value={form.search_radius_km}
                onChange={(e) => setForm({ ...form, search_radius_km: Number(e.target.value) })}
                className="w-full mt-3 accent-violet-600"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider block mb-2">Salario mínimo deseado (MXN/mes)</label>
              <input
                type="number"
                value={form.salary_min}
                onChange={(e) => setForm({ ...form, salary_min: e.target.value })}
                placeholder="Ej. 25000"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-violet-500/50 focus:outline-none"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.remote_ok}
                  onChange={(e) => setForm({ ...form, remote_ok: e.target.checked })}
                  className="w-4 h-4 accent-violet-600"
                />
                <span className="text-sm text-white/70">Me interesan vacantes remotas</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-6 py-3 rounded-xl transition-all disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar perfil"}
          </button>
          {saved && <span className="text-sm text-emerald-400">✓ Guardado — las búsquedas ya usan tu perfil</span>}
        </div>
      </form>
    </div>
  );
}

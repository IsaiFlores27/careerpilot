"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117] px-6">
        <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Revisa tu email</h2>
          <p className="text-white/50 text-sm">
            Enviamos un enlace de confirmación a <span className="text-violet-400">{email}</span>. Haz clic en él para activar tu cuenta.
          </p>
          <Link href="/login" className="inline-block mt-6 text-sm text-violet-400 hover:text-violet-300 transition-colors">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#0f1117]">
      {/* Panel izquierdo */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-violet-900 via-indigo-900 to-[#0f1117] flex-col items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-600/20 via-transparent to-transparent" />
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center font-bold text-white text-lg">C</div>
            <span className="text-2xl font-bold text-white">CVitae</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-6">
            Empieza gratis,<br />
            <span className="text-violet-400">consigue más entrevistas</span>
          </h2>
          <div className="space-y-5 mt-10">
            {[
              { num: "01", title: "Sube tu CV", desc: "PDF o Word. La IA lo analiza en segundos." },
              { num: "02", title: "Optimiza para ATS", desc: "Reescribimos tu CV para pasar filtros automáticos." },
              { num: "03", title: "Encuentra vacantes", desc: "Búsqueda en tiempo real con Google Search." },
            ].map((step) => (
              <div key={step.num} className="flex gap-4">
                <span className="text-violet-400/60 text-sm font-mono shrink-0 mt-0.5">{step.num}</span>
                <div>
                  <p className="text-white font-medium text-sm">{step.title}</p>
                  <p className="text-white/50 text-xs mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-violet-600/10 translate-x-1/3 translate-y-1/3" />
      </div>

      {/* Panel derecho */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center font-bold text-white">C</div>
            <span className="text-xl font-bold">CVitae</span>
          </div>

          <h1 className="text-2xl font-bold mb-1">Crea tu cuenta</h1>
          <p className="text-white/50 text-sm mb-8">Gratis para siempre en el plan básico</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-1.5">Nombre completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                placeholder="Ana García"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1.5">Contraseña</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Creando cuenta..." : "Crear cuenta gratis"}
            </button>
          </form>

          <p className="text-center text-sm text-white/40 mt-8">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

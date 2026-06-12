"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/ui/logout-button";

export interface NavItem {
  href: string;
  label: string;
  group?: string;
}

const ICONS: Record<string, React.ReactNode> = {
  "/dashboard": <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  "/profile": <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
  "/cv": <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  "/jobs": <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  "/applications": <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  "/interview": <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />,
  "/coach": <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
  "/linkedin": <path strokeLinecap="round" strokeLinejoin="round" d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 4a2 2 0 100 4 2 2 0 000-4z" />,
  "/documents": <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />,
};

// Orden según el flujo real de búsqueda de empleo, agrupado.
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Inicio", group: "Resumen" },
  { href: "/profile", label: "Mi perfil", group: "Resumen" },

  { href: "/cv", label: "Mi CV", group: "Prepárate" },
  { href: "/linkedin", label: "LinkedIn", group: "Prepárate" },

  { href: "/jobs", label: "Vacantes", group: "Postúlate" },
  { href: "/applications", label: "Pipeline", group: "Postúlate" },

  { href: "/interview", label: "Entrevista", group: "Avanza" },
  { href: "/coach", label: "Coach IA", group: "Avanza" },
  { href: "/documents", label: "Documentos", group: "Avanza" },
];

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  let lastGroup = "";
  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {NAV.map((item) => {
        const showGroup = item.group && item.group !== lastGroup;
        lastGroup = item.group ?? lastGroup;
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <div key={item.href}>
            {showGroup && (
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider px-3 mt-4 mb-1.5 first:mt-1">
                {item.group}
              </p>
            )}
            <Link
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group ${
                active ? "bg-violet-600/15 text-white" : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className={`transition-colors ${active ? "text-violet-400" : "text-white/40 group-hover:text-violet-400"}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  {ICONS[item.href]}
                </svg>
              </span>
              {item.label}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar({ email, initials }: { email: string; initials: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Topbar móvil */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#13151f] border-b border-white/5 flex items-center justify-between px-4 z-30">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center font-bold text-white text-xs">C</div>
          <span className="font-bold text-white">CVitae</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:bg-white/5"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar (fijo en desktop, drawer en móvil) */}
      <aside
        className={`fixed h-full bg-[#13151f] border-r border-white/5 flex flex-col z-50 w-64 transition-transform duration-200 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
              <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center font-bold text-white text-sm">C</div>
              <span className="font-bold text-white text-lg">CVitae</span>
            </Link>
            <p className="text-xs text-white/30 mt-1.5 ml-10">Coach de carrera con IA</p>
          </div>
          {/* Cerrar en móvil */}
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
            className="md:hidden text-white/40 hover:text-white/80 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <NavList pathname={pathname} onNavigate={() => setMobileOpen(false)} />

        {/* Footer usuario */}
        <div className="px-3 py-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 mb-1">
            <div className="w-7 h-7 rounded-full bg-violet-600/80 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {initials}
            </div>
            <p className="text-xs text-white/50 truncate flex-1">{email}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}

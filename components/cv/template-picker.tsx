"use client";

import { useState } from "react";
import type { CvProfile } from "@/lib/ai/schemas/cv-profile";

export type TemplateId = "default" | "classic" | "executive" | "modern" | "minimal";

interface Template {
  id: TemplateId;
  name: string;
  description: string;
  preview: (p: CvProfile) => React.ReactNode;
}

const TEMPLATES: Template[] = [
  {
    id: "default",
    name: "Original",
    description: "Tu formato actual con acento violeta y diseño limpio.",
    preview: (p) => <DefaultPreview p={p} />,
  },
  {
    id: "classic",
    name: "ATS Classic",
    description: "Máxima compatibilidad con sistemas ATS. Sin color, una columna, perfecto para corporativos.",
    preview: (p) => <ClassicPreview p={p} />,
  },
  {
    id: "executive",
    name: "Executive",
    description: "Barra lateral oscura con tus datos. Elegante y memorable para puestos directivos.",
    preview: (p) => <ExecutivePreview p={p} />,
  },
  {
    id: "modern",
    name: "Modern",
    description: "Encabezado con acento violeta, dos columnas. Ideal para tecnología y startups.",
    preview: (p) => <ModernPreview p={p} />,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Ultra-limpio con espacio generoso. Para diseñadores y perfiles creativos premium.",
    preview: (p) => <MinimalPreview p={p} />,
  },
];

interface Props {
  resumeId: string;
  profile: CvProfile;
  onClose: () => void;
}

export function TemplatePicker({ resumeId, profile, onClose }: Props) {
  const [selected, setSelected] = useState<TemplateId>("default");
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cv/render?resume_id=${resumeId}&template=${selected}`);
      if (!res.ok) throw new Error("Error generando PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CV_${profile.contact?.name?.replace(/\s+/g, "_") ?? "CV"}_${selected}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch {
      alert("Ocurrió un error al generar el PDF. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const selectedTpl = TEMPLATES.find(t => t.id === selected)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#13151f] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-white">Elige una plantilla</h2>
            <p className="text-sm text-white/50 mt-0.5">Selecciona el diseño para tu CV descargable · 1 página</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors text-2xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Template cards */}
          <div className="w-72 flex-shrink-0 overflow-y-auto border-r border-white/10 p-4 space-y-3">
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => setSelected(tpl.id)}
                className={`w-full text-left rounded-xl border p-3 transition-all ${
                  selected === tpl.id
                    ? "border-violet-500 bg-violet-500/10"
                    : "border-white/8 hover:border-white/20 bg-white/3"
                }`}
              >
                <span className="block text-sm font-semibold text-white">{tpl.name}</span>
                <span className="block text-xs text-white/50 mt-1 leading-relaxed">{tpl.description}</span>
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-auto bg-[#0d0f18] p-6 flex items-start justify-center">
            <div
              className="origin-top scale-[0.72] bg-white shadow-2xl"
              style={{ width: 612, minHeight: 792, transformOrigin: "top center" }}
            >
              {selectedTpl.preview(profile)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
          <span className="text-sm text-white/40">
            Plantilla: <span className="text-white/70 font-medium">{selectedTpl.name}</span>
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white/90 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDownload}
              disabled={loading}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-60 transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Preview components (HTML/CSS, no PDF) ──────────────────────────────────

const S = {
  name: (c: string) => ({ fontSize: 18, fontWeight: 700, color: c }),
  headline: { fontSize: 10, color: "#555", marginTop: 3 },
  contact: { fontSize: 8, color: "#888", marginTop: 2 },
  sectionTitle: (c: string, mt = 12) => ({ fontSize: 8, fontWeight: 700, color: c, letterSpacing: 1.2, textTransform: "uppercase" as const, marginTop: mt }),
  hr: (c: string) => ({ border: "none", borderTop: `1px solid ${c}`, margin: "4px 0 6px" }),
  company: { fontSize: 10, fontWeight: 700, color: "#111" },
  dates: { fontSize: 8, color: "#888" },
  role: { fontSize: 9, color: "#444", marginTop: 2 },
  bullet: { fontSize: 8.5, color: "#333", marginBottom: 1.5 },
  body: { fontSize: 9, color: "#333", lineHeight: 1.5, marginTop: 4 },
};

function ExpItems({ exps, bulletColor }: { exps: CvProfile["experience"], bulletColor: string }) {
  return (
    <>
      {(exps ?? []).slice(0, 2).map((exp, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={S.company}>{exp.company}</span>
            <span style={S.dates}>{exp.start} – {exp.current ? "Presente" : exp.end}</span>
          </div>
          <div style={S.role}>{exp.role}</div>
          {(exp.achievements_with_metrics?.length ? exp.achievements_with_metrics : exp.bullets ?? []).slice(0, 2).map((b, j) => (
            <div key={j} style={{ display: "flex", gap: 4, marginTop: 2 }}>
              <span style={{ color: bulletColor, fontSize: 8 }}>▸</span>
              <span style={S.bullet}>{b}</span>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function DefaultPreview({ p }: { p: CvProfile }) {
  return (
    <div style={{ fontFamily: "Helvetica, Arial, sans-serif", padding: "36px 48px", background: "#fff", height: 792 }}>
      <div style={{ borderBottom: "2px solid #7c3aed", paddingBottom: 10, marginBottom: 12 }}>
        <div style={S.name("#7c3aed")}>{p.contact?.name}</div>
        {p.headline && <div style={S.headline}>{p.headline}</div>}
        <div style={S.contact}>{[p.contact?.email, p.contact?.phone, p.contact?.location].filter(Boolean).join("  ·  ")}</div>
      </div>
      {p.summary && (
        <>
          <div style={S.sectionTitle("#7c3aed", 0)}>Resumen</div>
          <hr style={S.hr("#ddd")} />
          <div style={S.body}>{p.summary?.slice(0, 200)}...</div>
        </>
      )}
      <div style={S.sectionTitle("#7c3aed")}>Experiencia</div>
      <hr style={S.hr("#ddd")} />
      <ExpItems exps={p.experience} bulletColor="#7c3aed" />
      <div style={S.sectionTitle("#7c3aed")}>Educación</div>
      <hr style={S.hr("#ddd")} />
      {(p.education ?? []).slice(0, 1).map((e, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          <span style={S.company}>{e.institution}</span>
          <div style={S.role}>{[e.degree, e.field].filter(Boolean).join(" · ")}</div>
        </div>
      ))}
    </div>
  );
}

function ClassicPreview({ p }: { p: CvProfile }) {
  return (
    <div style={{ fontFamily: "Helvetica, Arial, sans-serif", padding: "50px", background: "#fff", height: 792 }}>
      <div style={S.name("#111")}>{p.contact?.name}</div>
      {p.headline && <div style={S.headline}>{p.headline}</div>}
      <div style={{ fontSize: 8, color: "#aaa", marginTop: 2 }}>{[p.contact?.email, p.contact?.phone, p.contact?.location].filter(Boolean).join("  ·  ")}</div>
      <hr style={{ border: "none", borderTop: "0.5px solid #ccc", margin: "10px 0 6px" }} />
      {p.summary && (
        <>
          <div style={S.sectionTitle("#111", 0)}>Resumen Profesional</div>
          <hr style={S.hr("#ccc")} />
          <div style={S.body}>{p.summary?.slice(0, 180)}...</div>
        </>
      )}
      <div style={S.sectionTitle("#111")}>Experiencia</div>
      <hr style={S.hr("#ccc")} />
      <ExpItems exps={p.experience} bulletColor="#888" />
      <div style={S.sectionTitle("#111")}>Educación</div>
      <hr style={S.hr("#ccc")} />
      {(p.education ?? []).slice(0, 1).map((e, i) => (
        <div key={i}><span style={S.company}>{e.institution}</span><div style={S.role}>{[e.degree, e.field].filter(Boolean).join(" · ")}</div></div>
      ))}
      <div style={S.sectionTitle("#111", 10)}>Habilidades</div>
      <hr style={S.hr("#ccc")} />
      <div style={{ fontSize: 8.5, color: "#333" }}>{[...(p.skills?.hard ?? []), ...(p.skills?.tools ?? [])].slice(0, 10).join("  ·  ")}</div>
    </div>
  );
}

function ExecutivePreview({ p }: { p: CvProfile }) {
  const skills = [...(p.skills?.hard ?? []), ...(p.skills?.tools ?? [])];
  return (
    <div style={{ fontFamily: "Helvetica, Arial, sans-serif", display: "flex", height: 792, background: "#fff" }}>
      {/* Sidebar */}
      <div style={{ width: 170, background: "#1a2347", padding: "36px 16px", flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{p.contact?.name}</div>
        {p.headline && <div style={{ fontSize: 8.5, color: "#c8cde0", marginTop: 4 }}>{p.headline}</div>}
        <hr style={{ border: "none", borderTop: "0.4px solid rgba(255,255,255,0.2)", margin: "10px 0" }} />
        <div style={{ fontSize: 7.5, fontWeight: 700, color: "#6aa8f5", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Contacto</div>
        {[p.contact?.email, p.contact?.phone, p.contact?.location].filter(Boolean).map((c, i) => (
          <div key={i} style={{ fontSize: 8, color: "#c8cde0", marginBottom: 3, wordBreak: "break-all" }}>{c}</div>
        ))}
        <hr style={{ border: "none", borderTop: "0.4px solid rgba(255,255,255,0.2)", margin: "10px 0" }} />
        <div style={{ fontSize: 7.5, fontWeight: 700, color: "#6aa8f5", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Habilidades</div>
        {skills.slice(0, 10).map((s, i) => <div key={i} style={{ fontSize: 8, color: "#c8cde0", marginBottom: 2 }}>· {s}</div>)}
      </div>
      {/* Main */}
      <div style={{ flex: 1, padding: "36px 24px 36px 20px" }}>
        {p.summary && (
          <>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: "#1a2347", letterSpacing: 1, textTransform: "uppercase" }}>Resumen</div>
            <hr style={{ border: "none", borderTop: "0.6px solid #1a2347", margin: "4px 0 6px" }} />
            <div style={S.body}>{p.summary?.slice(0, 180)}...</div>
          </>
        )}
        <div style={{ fontSize: 8.5, fontWeight: 700, color: "#1a2347", letterSpacing: 1, textTransform: "uppercase", marginTop: 12 }}>Experiencia</div>
        <hr style={{ border: "none", borderTop: "0.6px solid #1a2347", margin: "4px 0 6px" }} />
        <ExpItems exps={p.experience} bulletColor="#6aa8f5" />
        <div style={{ fontSize: 8.5, fontWeight: 700, color: "#1a2347", letterSpacing: 1, textTransform: "uppercase", marginTop: 10 }}>Educación</div>
        <hr style={{ border: "none", borderTop: "0.6px solid #1a2347", margin: "4px 0 6px" }} />
        {(p.education ?? []).slice(0, 1).map((e, i) => (
          <div key={i}><span style={{ fontSize: 10, fontWeight: 700, color: "#1a2347" }}>{e.institution}</span><div style={S.role}>{[e.degree, e.field].filter(Boolean).join(" · ")}</div></div>
        ))}
      </div>
    </div>
  );
}

function ModernPreview({ p }: { p: CvProfile }) {
  const skills = [...(p.skills?.hard ?? []), ...(p.skills?.soft ?? []), ...(p.skills?.tools ?? [])];
  return (
    <div style={{ fontFamily: "Helvetica, Arial, sans-serif", background: "#fff", height: 792 }}>
      {/* Accent bars */}
      <div style={{ height: 8, background: "#7c3aed" }} />
      <div style={{ height: 6, background: "#a78bfa" }} />
      {/* Header */}
      <div style={{ background: "#f7f7fc", padding: "14px 36px 10px" }}>
        <div style={S.name("#7c3aed")}>{p.contact?.name}</div>
        {p.headline && <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{p.headline}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 8.5, color: "#888" }}>{[p.contact?.email, p.contact?.phone, p.contact?.location].filter(Boolean).join("   ·   ")}</span>
          {p.contact?.linkedin && <span style={{ fontSize: 8.5, color: "#7c3aed" }}>{p.contact.linkedin}</span>}
        </div>
      </div>
      {/* Two columns */}
      <div style={{ display: "flex", padding: "0 36px" }}>
        {/* Left */}
        <div style={{ flex: 1, paddingRight: 14, borderRight: "0.4px solid #e8e5f8" }}>
          {p.summary && (
            <>
              <div style={S.sectionTitle("#7c3aed", 10)}>Resumen</div>
              <hr style={S.hr("#e8e5f8")} />
              <div style={S.body}>{p.summary?.slice(0, 160)}...</div>
            </>
          )}
          <div style={S.sectionTitle("#7c3aed")}>Experiencia</div>
          <hr style={S.hr("#e8e5f8")} />
          <ExpItems exps={p.experience} bulletColor="#a78bfa" />
        </div>
        {/* Right */}
        <div style={{ width: 150, paddingLeft: 14 }}>
          <div style={S.sectionTitle("#7c3aed", 10)}>Habilidades</div>
          <hr style={S.hr("#e8e5f8")} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
            {skills.slice(0, 12).map((s, i) => (
              <span key={i} style={{ fontSize: 7.5, background: "#ede9ff", color: "#7c3aed", padding: "2px 6px", borderRadius: 3, fontWeight: 600 }}>{s}</span>
            ))}
          </div>
          {p.languages?.length && (
            <>
              <div style={S.sectionTitle("#7c3aed", 12)}>Idiomas</div>
              <hr style={S.hr("#e8e5f8")} />
              {p.languages.map((l, i) => (
                <div key={i} style={{ fontSize: 8.5, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: "#222" }}>{l.name}</span>
                  <span style={{ color: "#888", marginLeft: 4 }}>{l.level}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MinimalPreview({ p }: { p: CvProfile }) {
  const skills = [...(p.skills?.hard ?? []), ...(p.skills?.tools ?? [])];
  return (
    <div style={{ fontFamily: "Helvetica, Arial, sans-serif", padding: "54px", background: "#fff", height: 792 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#111", letterSpacing: -0.5 }}>{p.contact?.name}</div>
      {p.headline && <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{p.headline}</div>}
      <hr style={{ border: "none", borderTop: "0.4px solid #e5e5e8", margin: "8px 0 10px" }} />
      <div style={{ textAlign: "right" }}>
        {[p.contact?.email, p.contact?.phone, p.contact?.location].filter(Boolean).map((c, i) => (
          <div key={i} style={{ fontSize: 8.5, color: "#aaa", marginBottom: 2 }}>{c}</div>
        ))}
      </div>
      {p.summary && (
        <>
          <div style={{ fontSize: 7.5, fontWeight: 700, color: "#888", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 8 }}>Perfil</div>
          <hr style={{ border: "none", borderTop: "0.3px solid #eee", margin: "6px 0 7px" }} />
          <div style={{ fontSize: 9.5, color: "#333", lineHeight: 1.55 }}>{p.summary?.slice(0, 200)}...</div>
        </>
      )}
      <div style={{ fontSize: 7.5, fontWeight: 700, color: "#888", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 14 }}>Experiencia</div>
      <hr style={{ border: "none", borderTop: "0.3px solid #eee", margin: "6px 0 7px" }} />
      {(p.experience ?? []).slice(0, 2).map((exp, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#111" }}>{exp.company}</span>
            <span style={{ fontSize: 9, color: "#bbb" }}>{exp.start} – {exp.current ? "Presente" : exp.end}</span>
          </div>
          <div style={{ fontSize: 9.5, color: "#666", marginTop: 2 }}>{exp.role}</div>
          {(exp.achievements_with_metrics?.length ? exp.achievements_with_metrics : exp.bullets ?? []).slice(0, 2).map((b, j) => (
            <div key={j} style={{ display: "flex", gap: 6, marginTop: 2, fontSize: 9, color: "#444" }}>
              <span style={{ color: "#bbb" }}>–</span><span>{b}</span>
            </div>
          ))}
        </div>
      ))}
      <div style={{ fontSize: 7.5, fontWeight: 700, color: "#888", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 10 }}>Habilidades</div>
      <hr style={{ border: "none", borderTop: "0.3px solid #eee", margin: "6px 0 8px" }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {skills.slice(0, 14).map((s, i) => (
          <span key={i} style={{ fontSize: 8.5, color: "#444", background: "#f2f2f4", border: "0.5px solid #e0e0e3", padding: "2px 8px", borderRadius: 2 }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

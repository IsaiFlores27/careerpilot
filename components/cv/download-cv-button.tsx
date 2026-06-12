"use client";

import { useState } from "react";
import { TemplatePicker } from "./template-picker";
import type { CvProfile } from "@/lib/ai/schemas/cv-profile";

interface Props {
  resumeId: string;
  profile?: CvProfile;
}

export function DownloadCvButton({ resumeId, profile }: Props) {
  const [open, setOpen] = useState(false);

  // If no profile, fall back to direct download (no template choice)
  if (!profile) {
    return <DirectDownloadButton resumeId={resumeId} />;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm px-4 py-2.5 rounded-xl transition-all"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Descargar PDF
      </button>
      {open && (
        <TemplatePicker
          resumeId={resumeId}
          profile={profile}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function DirectDownloadButton({ resumeId }: { resumeId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/cv/render?resume_id=${resumeId}`);
      if (!res.ok) throw new Error("Error al generar PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cv.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Error al generar el PDF. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Generando PDF...
        </>
      ) : (
        <>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Descargar PDF
        </>
      )}
    </button>
  );
}

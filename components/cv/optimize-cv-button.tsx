"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OptimizeCvButton({ resumeId }: { resumeId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleOptimize() {
    setLoading(true);
    const res = await fetch("/api/cv/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_id: resumeId }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/cv/${data.optimized_resume_id}`);
    } else {
      alert("Error al optimizar el CV. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleOptimize}
      disabled={loading}
      className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
    >
      {loading ? "Optimizando..." : "Optimizar para ATS"}
    </button>
  );
}

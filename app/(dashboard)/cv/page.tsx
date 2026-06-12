"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CvPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setError("");
    setUploading(true);

    // 1. Subir archivo
    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch("/api/cv/upload", {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) {
      const data = await uploadRes.json();
      setError(data.error ?? "Error al subir el archivo");
      setUploading(false);
      return;
    }

    const { resume_id } = await uploadRes.json();
    setUploading(false);
    setAnalyzing(true);

    // 2. Analizar con IA
    const analyzeRes = await fetch("/api/cv/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_id }),
    });

    if (!analyzeRes.ok) {
      const data = await analyzeRes.json();
      setError(data.error ?? "Error al analizar el CV");
      setAnalyzing(false);
      return;
    }

    setAnalyzing(false);
    router.push(`/cv/${resume_id}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Mi CV</h1>
      <p className="text-gray-500 text-sm mb-6">
        Sube tu CV en PDF o Word. Lo analizamos con IA y te damos un diagnóstico detallado.
      </p>

      <form onSubmit={handleUpload} className="bg-white border border-gray-200 rounded-xl p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const dropped = e.dataTransfer.files[0];
            if (dropped) setFile(dropped);
          }}
          onClick={() => document.getElementById("cv-input")?.click()}
        >
          <input
            id="cv-input"
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div>
              <p className="text-2xl mb-2">📄</p>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-400 mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div>
              <p className="text-4xl mb-3">📄</p>
              <p className="font-medium text-gray-700">
                Arrastra tu CV aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-gray-400 mt-2">PDF o Word · máx. 10 MB</p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!file || uploading || analyzing}
          className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {uploading
            ? "Subiendo..."
            : analyzing
            ? "Analizando con IA... (puede tomar ~20 segundos)"
            : "Analizar CV"}
        </button>
      </form>

      {analyzing && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-medium">Procesando tu CV...</p>
          <p className="text-xs mt-1">
            La IA está leyendo tu CV, extrayendo el perfil estructurado y calculando tu ATS Score.
          </p>
        </div>
      )}
    </div>
  );
}

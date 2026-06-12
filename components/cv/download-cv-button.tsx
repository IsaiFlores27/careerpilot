"use client";

export function DownloadCvButton({ resumeId }: { resumeId: string }) {
  async function handleDownload() {
    const url = `/api/cv/render?resume_id=${resumeId}`;
    const a = document.createElement("a");
    a.href = url;
    a.click();
  }

  return (
    <button
      onClick={handleDownload}
      className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
    >
      Descargar PDF
    </button>
  );
}

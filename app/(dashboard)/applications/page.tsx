import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  applied: { label: "Aplicado", color: "bg-blue-50 text-blue-700" },
  follow_up: { label: "Follow-up", color: "bg-yellow-50 text-yellow-700" },
  interview: { label: "Entrevista", color: "bg-purple-50 text-purple-700" },
  offer: { label: "Oferta", color: "bg-green-50 text-green-700" },
  rejected: { label: "Rechazado", color: "bg-red-50 text-red-500" },
};

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: applications } = await supabase
    .from("applications")
    .select(`
      id, status, applied_at, next_follow_up_at, notes,
      jobs(title, company, location, url)
    `)
    .eq("user_id", user!.id)
    .order("applied_at", { ascending: false });

  const grouped = (["applied", "follow_up", "interview", "offer", "rejected"] as const).reduce(
    (acc, status) => {
      acc[status] = (applications ?? []).filter((a) => a.status === status);
      return acc;
    },
    {} as Record<string, typeof applications>
  );

  const total = applications?.length ?? 0;
  const interviews = grouped["interview"]?.length ?? 0;
  const offers = grouped["offer"]?.length ?? 0;
  const conversionRate = total > 0 ? Math.round((interviews / total) * 100) : 0;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">Pipeline de postulaciones</h1>
      <p className="text-gray-500 text-sm mb-6">Sigue el estado de cada vacante a la que aplicaste.</p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-400 mt-0.5">Postulaciones</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{interviews}</p>
          <p className="text-xs text-gray-400 mt-0.5">Entrevistas</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{offers}</p>
          <p className="text-xs text-gray-400 mt-0.5">Ofertas</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{conversionRate}%</p>
          <p className="text-xs text-gray-400 mt-0.5">Tasa entrevistas</p>
        </div>
      </div>

      {total === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p>Aún no tienes postulaciones registradas.</p>
          <p className="text-sm mt-1">Encuentra vacantes y empieza a aplicar.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(["interview", "follow_up", "applied", "offer", "rejected"] as const).map((status) => {
            const apps = grouped[status] ?? [];
            if (apps.length === 0) return null;
            const { label, color } = STATUS_LABELS[status];

            return (
              <div key={status}>
                <h2 className="font-semibold text-sm text-gray-500 uppercase mb-3">
                  {label} ({apps.length})
                </h2>
                <div className="space-y-2">
                  {apps.map((app) => {
                    const job = app.jobs as unknown as { title?: string; company?: string; location?: string; url?: string } | null;
                    return (
                      <div
                        key={app.id}
                        className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{job?.title ?? "Vacante"}</p>
                          <p className="text-xs text-gray-500">{job?.company} {job?.location ? `· ${job.location}` : ""}</p>
                          {app.next_follow_up_at && (
                            <p className="text-xs text-yellow-600 mt-1">
                              Follow-up: {new Date(app.next_follow_up_at).toLocaleDateString("es-MX")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-xs px-2 py-1 rounded-full ${color}`}>{label}</span>
                          {job?.url && (
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Ver →
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

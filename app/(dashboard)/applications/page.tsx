import { createClient } from "@/lib/supabase/server";

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  applied:   { label: "Aplicado",   dot: "bg-blue-500",   badge: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
  follow_up: { label: "Follow-up",  dot: "bg-amber-500",  badge: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
  interview: { label: "Entrevista", dot: "bg-violet-500", badge: "bg-violet-500/10 border-violet-500/20 text-violet-400" },
  offer:     { label: "Oferta",     dot: "bg-emerald-500",badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
  rejected:  { label: "Rechazado",  dot: "bg-red-500",    badge: "bg-red-500/10 border-red-500/20 text-red-400" },
};

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: applications } = await supabase
    .from("applications")
    .select(`id, status, applied_at, next_follow_up_at, notes, jobs(title, company, location, url)`)
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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Pipeline de postulaciones</h1>
        <p className="text-white/40 text-sm mt-1">Seguimiento de cada vacante a la que aplicaste.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Postulaciones", value: total, color: "text-white" },
          { label: "Entrevistas", value: interviews, color: "text-violet-400" },
          { label: "Ofertas", value: offers, color: "text-emerald-400" },
          { label: "Tasa entrevistas", value: `${conversionRate}%`, color: "text-blue-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/5 border border-white/5 rounded-2xl p-5">
            <p className="text-xs text-white/40 mb-2">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {total === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-white/40 font-medium">Sin postulaciones aún</p>
          <p className="text-white/25 text-sm mt-1">Busca vacantes y empieza a aplicar.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {(["interview", "follow_up", "applied", "offer", "rejected"] as const).map((status) => {
            const apps = grouped[status] ?? [];
            if (apps.length === 0) return null;
            const cfg = STATUS_CONFIG[status];

            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                    {cfg.label} <span className="text-white/25">({apps.length})</span>
                  </h2>
                </div>
                <div className="space-y-2">
                  {apps.map((app) => {
                    const job = app.jobs as unknown as { title?: string; company?: string; location?: string; url?: string } | null;
                    return (
                      <div
                        key={app.id}
                        className="bg-white/5 border border-white/5 rounded-xl px-5 py-4 flex items-center justify-between gap-4 hover:border-white/10 transition-all"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-white truncate">{job?.title ?? "Vacante"}</p>
                          <p className="text-xs text-white/40 mt-0.5">
                            {job?.company}{job?.location ? ` · ${job.location}` : ""}
                          </p>
                          {app.next_follow_up_at && (
                            <p className="text-xs text-amber-400/70 mt-1">
                              Follow-up: {new Date(app.next_follow_up_at).toLocaleDateString("es-MX")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-xs px-2.5 py-1 rounded-lg border ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                          {job?.url && (
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-white/30 hover:text-white/70 transition-colors"
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

import type { NormalizedJob, JobSearchParams } from "./types";

export async function searchAdzuna(params: JobSearchParams): Promise<NormalizedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  // Adzuna organiza su API por país — detectar del location o default a México
  const country = "mx";
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("what", params.query);
  url.searchParams.set("where", params.location);
  url.searchParams.set("results_per_page", String(params.limit ?? 10));
  if (params.radius_km) {
    url.searchParams.set("distance", String(params.radius_km));
  }

  const response = await fetch(url.toString(), {
    next: { revalidate: 3600 },
  });

  if (!response.ok) return [];

  const data = await response.json();
  const results = data.results ?? [];

  return results.map(
    (j: Record<string, unknown>): NormalizedJob => ({
      external_id: `adzuna_${j.id}`,
      source: "adzuna",
      title: (j.title as string) ?? "",
      company: ((j.company as Record<string, string>)?.display_name) ?? "",
      description: (j.description as string) ?? "",
      url: (j.redirect_url as string) ?? "",
      location: ((j.location as Record<string, string>)?.display_name) ?? "",
      remote: false,
      salary_min: j.salary_min as number | undefined,
      salary_max: j.salary_max as number | undefined,
      posted_at: j.created as string | undefined,
    })
  );
}

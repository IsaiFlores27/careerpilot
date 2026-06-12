import type { NormalizedJob, JobSearchParams } from "./types";

export async function searchJooble(params: JobSearchParams): Promise<NormalizedJob[]> {
  const apiKey = process.env.JOOBLE_API_KEY;
  if (!apiKey) return [];

  const response = await fetch(`https://jooble.org/api/${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keywords: params.query,
      location: params.location,
      radius: params.radius_km ?? 25,
      resultonpage: params.limit ?? 10,
    }),
    next: { revalidate: 3600 },
  });

  if (!response.ok) return [];

  const data = await response.json();
  const jobs = data.jobs ?? [];

  return jobs.map(
    (j: Record<string, unknown>): NormalizedJob => ({
      external_id: `jooble_${j.id}`,
      source: "jooble",
      title: (j.title as string) ?? "",
      company: (j.company as string) ?? "",
      description: (j.snippet as string) ?? "",
      url: (j.link as string) ?? "",
      location: (j.location as string) ?? "",
      remote: ((j.type as string) ?? "").toLowerCase().includes("remote"),
      salary_min: undefined,
      salary_max: undefined,
      posted_at: j.updated as string | undefined,
    })
  );
}

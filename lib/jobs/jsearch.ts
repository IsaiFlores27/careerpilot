import type { NormalizedJob, JobSearchParams } from "./types";

export async function searchJSearch(params: JobSearchParams): Promise<NormalizedJob[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return [];

  const url = new URL("https://jsearch.p.rapidapi.com/search");
  url.searchParams.set("query", `${params.query} in ${params.location}`);
  url.searchParams.set("num_pages", "1");
  url.searchParams.set("page", "1");
  if (params.remote_ok) url.searchParams.set("remote_jobs_only", "false");

  const response = await fetch(url.toString(), {
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) return [];

  const data = await response.json();
  const jobs = data.data ?? [];

  return jobs.slice(0, params.limit ?? 10).map(
    (j: Record<string, unknown>): NormalizedJob => ({
      external_id: `jsearch_${j.job_id}`,
      source: "jsearch",
      title: (j.job_title as string) ?? "",
      company: (j.employer_name as string) ?? "",
      description: (j.job_description as string) ?? "",
      url: (j.job_apply_link as string) ?? (j.job_google_link as string) ?? "",
      location: `${j.job_city ?? ""}, ${j.job_country ?? ""}`.trim().replace(/^,\s*/, ""),
      lat: j.job_latitude as number | undefined,
      lng: j.job_longitude as number | undefined,
      remote: (j.job_is_remote as boolean) ?? false,
      salary_min: j.job_min_salary as number | undefined,
      salary_max: j.job_max_salary as number | undefined,
      posted_at: j.job_posted_at_datetime_utc as string | undefined,
    })
  );
}

import type { NormalizedJob, JobSearchParams } from "./types";

// Mapea el país del texto de ubicación a un código ISO para JSearch.
// JSearch filtra por `country` (ISO-2); por defecto México.
function inferCountry(location?: string): string {
  const loc = (location ?? "").toLowerCase();
  if (/(españa|madrid|barcelona|valencia|sevilla)/.test(loc)) return "es";
  if (/(argentina|buenos aires|córdoba)/.test(loc)) return "ar";
  if (/(colombia|bogotá|medellín)/.test(loc)) return "co";
  if (/(chile|santiago)/.test(loc)) return "cl";
  if (/(perú|peru|lima)/.test(loc)) return "pe";
  if (/(estados unidos|usa|united states)/.test(loc)) return "us";
  return "mx";
}

export async function searchJSearch(params: JobSearchParams): Promise<NormalizedJob[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return [];

  const country = inferCountry(params.location);

  const url = new URL("https://jsearch.p.rapidapi.com/search");
  // La query NO debe incluir la ubicación; el filtro geográfico va en `country`.
  url.searchParams.set("query", params.query);
  url.searchParams.set("page", "1");
  url.searchParams.set("num_pages", "1");
  url.searchParams.set("country", country);
  url.searchParams.set("date_posted", "month"); // vacantes recientes
  if (params.remote_ok) url.searchParams.set("remote_jobs_only", "false");

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
      next: { revalidate: 3600 },
    });
  } catch (err) {
    console.error("[jsearch] fetch error:", err);
    return [];
  }

  if (!response.ok) {
    console.error("[jsearch] non-OK response:", response.status);
    return [];
  }

  const data = await response.json();
  const jobs = data.data ?? [];

  return jobs.slice(0, params.limit ?? 12).map(
    (j: Record<string, unknown>): NormalizedJob => {
      const city = (j.job_city as string) ?? "";
      const region = (j.job_state as string) ?? "";
      const ctry = (j.job_country as string) ?? "";
      const location = [city, region, ctry].filter(Boolean).join(", ") || (params.location ?? "");

      return {
        external_id: `jsearch_${j.job_id}`,
        source: "jsearch",
        title: (j.job_title as string) ?? "",
        company: (j.employer_name as string) ?? "",
        description: (j.job_description as string) ?? "",
        url: (j.job_apply_link as string) ?? (j.job_google_link as string) ?? "",
        location,
        lat: j.job_latitude as number | undefined,
        lng: j.job_longitude as number | undefined,
        remote: (j.job_is_remote as boolean) ?? false,
        salary_min: (j.job_min_salary as number | undefined) ?? undefined,
        salary_max: (j.job_max_salary as number | undefined) ?? undefined,
        posted_at: j.job_posted_at_datetime_utc as string | undefined,
      };
    }
  );
}

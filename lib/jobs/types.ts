export interface NormalizedJob {
  external_id: string;
  source: "jsearch" | "adzuna" | "jooble" | "manual";
  title: string;
  company: string;
  description: string;
  url: string;
  location: string;
  lat?: number;
  lng?: number;
  remote: boolean;
  salary_min?: number;
  salary_max?: number;
  posted_at?: string;
}

export interface JobSearchParams {
  query: string;
  location: string;
  lat?: number;
  lng?: number;
  radius_km?: number;
  remote_ok?: boolean;
  limit?: number;
}

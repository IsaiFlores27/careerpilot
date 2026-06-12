-- Extensiones necesarias
create extension if not exists vector;
create extension if not exists earthdistance cascade;

-- Perfil de búsqueda del usuario
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  target_role text,
  target_industry text,
  location text,
  lat double precision,
  lng double precision,
  search_radius_km int default 25,
  remote_ok boolean default true,
  salary_min numeric,
  language text default 'es',
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CVs subidos y versiones generadas
create table resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  kind text check (kind in ('original','optimized','tailored')) not null,
  parent_id uuid references resumes(id),
  job_id uuid,
  storage_path text,
  original_filename text,
  raw_text text,
  structured jsonb,
  ats_score int,
  diagnosis jsonb,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- Vacantes (caché normalizado de las APIs externas)
create table jobs (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  source text,
  title text not null,
  company text,
  description text,
  url text,
  location text,
  lat double precision,
  lng double precision,
  remote boolean default false,
  salary_min numeric,
  salary_max numeric,
  posted_at timestamptz,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- Matches usuario ↔ vacante
create table job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  job_id uuid references jobs not null,
  match_score numeric,
  match_reasons jsonb,
  status text default 'suggested' check (status in ('suggested','saved','dismissed')),
  notified_at timestamptz,
  unique (user_id, job_id)
);

-- Pipeline de postulaciones
create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  job_id uuid references jobs,
  resume_id uuid references resumes,
  status text default 'applied' check (
    status in ('applied','follow_up','interview','offer','rejected')
  ),
  applied_at timestamptz default now(),
  next_follow_up_at timestamptz,
  notes text
);

-- Artefactos generados por el coach
create table coach_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  application_id uuid references applications,
  type text check (type in (
    'seven_day_plan','cold_message','cover_letter',
    'interview_prep','follow_up','linkedin_profile'
  )),
  content jsonb not null,
  created_at timestamptz default now()
);

-- Historial del chat coach
create table coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  role text check (role in ('user','assistant')),
  content jsonb not null,
  created_at timestamptz default now()
);

-- ──────────────────────── RLS ────────────────────────

alter table profiles enable row level security;
create policy "own profile" on profiles for all using (auth.uid() = id);

alter table resumes enable row level security;
create policy "own resumes" on resumes for all using (auth.uid() = user_id);

alter table jobs enable row level security;
create policy "jobs are public read" on jobs for select using (true);
create policy "service can insert jobs" on jobs for insert with check (true);

alter table job_matches enable row level security;
create policy "own matches" on job_matches for all using (auth.uid() = user_id);

alter table applications enable row level security;
create policy "own applications" on applications for all using (auth.uid() = user_id);

alter table coach_artifacts enable row level security;
create policy "own artifacts" on coach_artifacts for all using (auth.uid() = user_id);

alter table coach_messages enable row level security;
create policy "own messages" on coach_messages for all using (auth.uid() = user_id);

-- ──────────────────────── Índices ────────────────────────

create index resumes_embedding_idx on resumes using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index jobs_embedding_idx on jobs using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Función para matching geográfico + semántico
create or replace function match_jobs_for_resume(
  p_resume_id uuid,
  p_user_lat double precision,
  p_user_lng double precision,
  p_radius_km int,
  p_limit int default 20
)
returns table (
  job_id uuid,
  title text,
  company text,
  location text,
  remote boolean,
  url text,
  posted_at timestamptz,
  similarity double precision
)
language sql
as $$
  select
    j.id,
    j.title,
    j.company,
    j.location,
    j.remote,
    j.url,
    j.posted_at,
    1 - (j.embedding <=> r.embedding) as similarity
  from jobs j
  cross join resumes r
  where r.id = p_resume_id
    and (
      j.remote = true
      or (j.lat is not null and j.lng is not null and
          earth_distance(
            ll_to_earth(j.lat, j.lng),
            ll_to_earth(p_user_lat, p_user_lng)
          ) <= p_radius_km * 1000)
    )
  order by j.embedding <=> r.embedding
  limit p_limit;
$$;

-- Trigger para updated_at en profiles
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- Cache de análisis avanzado del dashboard, ligado a cada CV
create table if not exists dashboard_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  resume_id uuid references resumes(id) on delete cascade not null,
  data jsonb not null,
  created_at timestamptz default now(),
  unique (user_id, resume_id)
);

alter table dashboard_insights enable row level security;

create policy "own insights select" on dashboard_insights
  for select using (auth.uid() = user_id);
create policy "own insights insert" on dashboard_insights
  for insert with check (auth.uid() = user_id);
create policy "own insights update" on dashboard_insights
  for update using (auth.uid() = user_id);

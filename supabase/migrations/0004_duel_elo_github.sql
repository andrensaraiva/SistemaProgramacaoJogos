-- =============================================================================
-- Fase 7/8 - ELO dos duelos e metadados GitHub Classroom
-- =============================================================================

alter table public.profiles
  add column if not exists duel_rating integer not null default 1000,
  add column if not exists duel_wins integer not null default 0,
  add column if not exists duel_losses integer not null default 0;

alter table public.duels
  add column if not exists challenger_rating_before integer,
  add column if not exists challenger_rating_after integer,
  add column if not exists opponent_rating_before integer,
  add column if not exists opponent_rating_after integer,
  add column if not exists rating_delta integer;

create index if not exists profiles_duel_rating_idx
  on public.profiles (duel_rating desc);

create table if not exists public.github_classroom_repos (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  repo_full_name text not null,
  student_name text,
  assignment_title text,
  latest_status text,
  latest_score numeric,
  latest_commit_sha text,
  latest_run_url text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, repo_full_name)
);

alter table public.github_classroom_repos enable row level security;

drop policy if exists "professor gerencia repos github classroom"
  on public.github_classroom_repos;

create policy "professor gerencia repos github classroom"
  on public.github_classroom_repos
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

insert into public.badges (id, title, description) values
  ('duel_win_5', 'Duelista', 'Venceu 5 duelos X1')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description;

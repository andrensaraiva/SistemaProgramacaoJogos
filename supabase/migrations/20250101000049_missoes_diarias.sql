-- =============================================================================
-- Resgate de MISSÕES DIÁRIAS
-- =============================================================================
-- As missões do dia (definidas em código, lib/gamification/missions.ts) dão
-- MOEDAS ao completar. O progresso é derivado da atividade do dia; aqui só
-- registramos o RESGATE (uma vez por missão por dia) pra creditar a moeda uma
-- única vez. A moeda cai em profiles.coins_bonus (mesma economia da loja).
--
-- Idempotente. Aplicar: npx supabase db push
-- =============================================================================

create table if not exists public.daily_mission_claims (
  student_id uuid not null references public.profiles(id) on delete cascade,
  mission_id text not null,
  claim_date date not null,
  reward integer not null default 0,
  claimed_at timestamptz not null default now(),
  primary key (student_id, mission_id, claim_date)
);

alter table public.daily_mission_claims enable row level security;

-- O aluno vê e cria só os próprios resgates.
drop policy if exists "aluno ve seus resgates" on public.daily_mission_claims;
create policy "aluno ve seus resgates" on public.daily_mission_claims
  for select using (auth.uid() = student_id);

drop policy if exists "aluno cria seus resgates" on public.daily_mission_claims;
create policy "aluno cria seus resgates" on public.daily_mission_claims
  for insert with check (auth.uid() = student_id);

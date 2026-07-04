-- =============================================================================
-- Checklist diário do professor (presença + plano de aula)
-- =============================================================================
-- Lembrete do dia a dia: o professor marca se já fez a CHAMADA e registrou o
-- PLANO DE AULA (na plataforma externa do SENAI). A plataforma não tem como
-- saber do sistema externo, então é uma confirmação MANUAL por dia. Uma linha
-- por (professor, data). Serve pra o painel lembrar do que ainda falta.
--
-- Idempotente. Aplicar: npx supabase db push
-- =============================================================================

create table if not exists public.teacher_daily_checklist (
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  check_date date not null,
  presenca_feita boolean not null default false,
  plano_registrado boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (teacher_id, check_date)
);

alter table public.teacher_daily_checklist enable row level security;

-- O professor vê e mexe só no próprio checklist.
drop policy if exists "professor ve seu checklist" on public.teacher_daily_checklist;
create policy "professor ve seu checklist" on public.teacher_daily_checklist
  for select using (auth.uid() = teacher_id);

drop policy if exists "professor gerencia seu checklist" on public.teacher_daily_checklist;
create policy "professor gerencia seu checklist" on public.teacher_daily_checklist
  for all using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

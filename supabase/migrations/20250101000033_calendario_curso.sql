-- =============================================================================
-- Calendário do curso (cronograma de UCs por turma) — Celeste Academy
-- =============================================================================
-- Camada de PLANEJAMENTO: por turma, uma grade de dias letivos onde cada DIA
-- recebe uma UC (ou um marcador: feriado/recesso/etc.). Totalizador soma as
-- aulas por UC contra a carga horária (fechar a CH). Feriados ficam num cadastro
-- institucional e aparecem marcados automaticamente.
--
-- O calendário é o PLANO; a frequência (attendance_sessions) é o REALIZADO.
-- Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Feriados / eventos institucionais (cadastro do admin)
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.holiday_kind as enum
    ('feriado', 'recesso', 'ferias', 'capacitacao', 'conselho', 'evento');
exception when duplicate_object then null;
end $$;

create table if not exists public.institution_holidays (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  name text not null,
  kind public.holiday_kind not null default 'feriado',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists institution_holidays_date_idx on public.institution_holidays (date);

alter table public.institution_holidays enable row level security;

drop policy if exists "admin gerencia feriados" on public.institution_holidays;
create policy "admin gerencia feriados" on public.institution_holidays
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "professor le feriados" on public.institution_holidays;
create policy "professor le feriados" on public.institution_holidays
  for select using (public.is_professor(auth.uid()));

-- -----------------------------------------------------------------------------
-- 2. Calendário da turma (1 por turma)
-- -----------------------------------------------------------------------------
create table if not exists public.course_calendars (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null unique references public.classes(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  weekdays integer[] not null default '{1,2,3,4,5}',  -- 1=seg ... 7=dom (ISO)
  aulas_por_dia integer not null default 4,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.course_calendars enable row level security;

drop policy if exists "professores e admin gerenciam calendario" on public.course_calendars;
create policy "professores e admin gerenciam calendario" on public.course_calendars
  for all using (public.is_admin(auth.uid()) or public.is_class_owner(class_id, auth.uid()))
  with check (public.is_admin(auth.uid()) or public.is_class_owner(class_id, auth.uid()));

-- -----------------------------------------------------------------------------
-- 3. Dias do calendário (cada dia letivo)
-- -----------------------------------------------------------------------------
create table if not exists public.calendar_days (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.course_calendars(id) on delete cascade,
  date date not null,
  class_unit_id uuid references public.class_units(id) on delete set null,  -- UC alocada
  marker text,                              -- null = aula normal; senão feriado/recesso/...
  note text,
  unique (calendar_id, date)
);
create index if not exists calendar_days_cal_idx on public.calendar_days (calendar_id, date);

alter table public.calendar_days enable row level security;

-- Acesso via o calendário (que já é por turma).
drop policy if exists "gerencia dias do proprio calendario" on public.calendar_days;
create policy "gerencia dias do proprio calendario" on public.calendar_days
  for all using (
    exists (
      select 1 from public.course_calendars c
      where c.id = calendar_id
        and (public.is_admin(auth.uid()) or public.is_class_owner(c.class_id, auth.uid()))
    )
  ) with check (
    exists (
      select 1 from public.course_calendars c
      where c.id = calendar_id
        and (public.is_admin(auth.uid()) or public.is_class_owner(c.class_id, auth.uid()))
    )
  );

-- -----------------------------------------------------------------------------
-- 4. Metas de carga horária por UC (totalizador)
-- -----------------------------------------------------------------------------
create table if not exists public.calendar_uc_targets (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.course_calendars(id) on delete cascade,
  class_unit_id uuid not null references public.class_units(id) on delete cascade,
  ch_presencial integer not null default 0,   -- carga horária presencial (horas)
  ord integer not null default 0,
  unique (calendar_id, class_unit_id)
);

alter table public.calendar_uc_targets enable row level security;

drop policy if exists "gerencia targets do proprio calendario" on public.calendar_uc_targets;
create policy "gerencia targets do proprio calendario" on public.calendar_uc_targets
  for all using (
    exists (
      select 1 from public.course_calendars c
      where c.id = calendar_id
        and (public.is_admin(auth.uid()) or public.is_class_owner(c.class_id, auth.uid()))
    )
  ) with check (
    exists (
      select 1 from public.course_calendars c
      where c.id = calendar_id
        and (public.is_admin(auth.uid()) or public.is_class_owner(c.class_id, auth.uid()))
    )
  );

-- -----------------------------------------------------------------------------
-- Verificação
-- -----------------------------------------------------------------------------
select
  exists (select 1 from pg_tables where tablename = 'institution_holidays') as feriados_ok,
  exists (select 1 from pg_tables where tablename = 'course_calendars') as cal_ok,
  exists (select 1 from pg_tables where tablename = 'calendar_days') as dias_ok,
  exists (select 1 from pg_tables where tablename = 'calendar_uc_targets') as targets_ok;

-- =============================================================================
-- Catálogo de exercícios compartilhado entre professores
-- =============================================================================
-- Até aqui um exercício só tocava uma UC indiretamente (quando anexado a uma
-- lista de uma turma). Para virar um BANCO catalogável — onde o professor
-- encontra exercícios de colegas por curso/UC/dificuldade/prova e aplica na sua
-- própria turma — o exercício precisa de metadado de catálogo próprio:
--
--   1. is_exam_suitable  → flag "sugerido para prova" (etiqueta/filtro; NÃO muda
--                          comportamento de correção nem liga o modo prova).
--   2. exercise_units     → vínculo N:N exercício ↔ UC(s) do plano de curso
--                          (curricular_units). Curso é derivado via módulo.
--
-- A leitura de exercícios públicos de qualquer autor já era permitida pela RLS
-- (migration 0001: "is_public or author_id = auth.uid()"), então o catálogo
-- compartilhado já lê exercícios de todos os professores. Aqui só adicionamos a
-- catalogação.
--
-- Aditiva e idempotente. Aplicar com: npx supabase db push
-- =============================================================================

-- 1. Flag "sugerido para prova" ------------------------------------------------
alter table public.exercises
  add column if not exists is_exam_suitable boolean not null default false;

-- 2. Vínculo N:N exercício ↔ UC ------------------------------------------------
create table if not exists public.exercise_units (
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  uc_id uuid not null references public.curricular_units(id) on delete cascade,
  primary key (exercise_id, uc_id)
);
create index if not exists exercise_units_uc_idx on public.exercise_units (uc_id);
create index if not exists exercise_units_exercise_idx on public.exercise_units (exercise_id);

alter table public.exercise_units enable row level security;

-- Leitura: qualquer professor (o catálogo é do corpo docente) OU quem já pode
-- ver o exercício (público ou autor) — cobre a página do exercício p/ o aluno.
drop policy if exists "ler exercise_units" on public.exercise_units;
create policy "ler exercise_units" on public.exercise_units
  for select using (
    public.is_professor(auth.uid())
    or exists (
      select 1 from public.exercises e
      where e.id = exercise_units.exercise_id
        and (e.is_public or e.author_id = auth.uid())
    )
  );

-- Escrita: só o autor do exercício cataloga o próprio exercício.
drop policy if exists "autor cataloga exercise_units" on public.exercise_units;
create policy "autor cataloga exercise_units" on public.exercise_units
  for all using (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_units.exercise_id and e.author_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_units.exercise_id and e.author_id = auth.uid()
    )
  );

-- 3. Verificação ---------------------------------------------------------------
select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'exercises'
      and column_name = 'is_exam_suitable'
  ) as coluna_prova_ok,
  exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'exercise_units'
  ) as tabela_exercise_units_ok,
  exists (
    select 1 from pg_policies
    where tablename = 'exercise_units' and policyname = 'ler exercise_units'
  ) as policy_leitura_ok;

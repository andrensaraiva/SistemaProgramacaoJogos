-- =============================================================================
-- Checklist diário POR TURMA (o professor pode dar aula de manhã e de tarde)
-- =============================================================================
-- A versão 0050 tinha 1 linha por (professor, dia) — não distinguia turmas.
-- Um professor com aula de manhã E de tarde precisa marcar chamada+plano de
-- CADA turma. Aqui adicionamos `class_id` e trocamos a PK para
-- (teacher, class, date). As turmas do dia vêm do calendário (calendar_days).
--
-- Migração de dados: as linhas antigas (class_id nulo) permanecem válidas como
-- "geral do dia" mas o app passa a usar por turma. Idempotente.
-- =============================================================================

alter table public.teacher_daily_checklist
  add column if not exists class_id uuid references public.classes(id) on delete cascade;

-- Recria a PK incluindo class_id. Postgres não deixa alterar PK direto; então
-- dropamos a antiga e criamos um índice único que trata NULL como distinto via
-- coalesce num índice de expressão.
do $$
begin
  -- Remove a PK antiga se existir (nome padrão).
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.teacher_daily_checklist'::regclass
      and contype = 'p'
  ) then
    execute (
      select 'alter table public.teacher_daily_checklist drop constraint ' || quote_ident(conname)
      from pg_constraint
      where conrelid = 'public.teacher_daily_checklist'::regclass and contype = 'p'
    );
  end if;
end $$;

-- Unicidade por (professor, turma, dia). coalesce trata a linha "geral" (class
-- nulo) como uma chave própria por dia.
-- NOTA: este índice de expressão foi substituído pela constraint simples na
-- migration 0053 (o upsert do app precisa mirar colunas, não expressão).
create unique index if not exists teacher_daily_checklist_uniq
  on public.teacher_daily_checklist (teacher_id, coalesce(class_id, '00000000-0000-0000-0000-000000000000'::uuid), check_date);

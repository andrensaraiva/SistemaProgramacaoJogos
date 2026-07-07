-- =============================================================================
-- Repara a constraint do checklist por turma (0052 deixou índice de expressão)
-- =============================================================================
-- A 0052 criou um índice único por expressão (coalesce), que o upsert do app
-- (onConflict teacher_id,class_id,check_date) NÃO consegue mirar. Trocamos por
-- uma constraint única simples nas 3 colunas. Idempotente.
-- =============================================================================

-- Remove linhas legadas sem turma e torna class_id obrigatório.
delete from public.teacher_daily_checklist where class_id is null;
alter table public.teacher_daily_checklist alter column class_id set not null;

-- Remove o índice de expressão da 0052 (se existir).
drop index if exists public.teacher_daily_checklist_uniq;

-- Constraint única simples que o upsert usa.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.teacher_daily_checklist'::regclass
      and conname = 'teacher_daily_checklist_teacher_class_date_key'
  ) then
    alter table public.teacher_daily_checklist
      add constraint teacher_daily_checklist_teacher_class_date_key
      unique (teacher_id, class_id, check_date);
  end if;
end $$;

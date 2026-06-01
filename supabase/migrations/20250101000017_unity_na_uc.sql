-- =============================================================================
-- Unity como atividade da UC (não mais solto por turma)
-- =============================================================================
-- A parte de Unity (GitHub Classroom) só deve aparecer dentro de uma UC que o
-- professor habilitou. Como decidimos tratar Unity como um TIPO de atividade,
-- o vínculo natural é com class_units (via assignment kind='unity', criado na
-- migration 0015). Aqui:
--
-- - github_classroom_repos.class_unit_id (substitui o vínculo solto por class_id)
-- - github_classroom_repos.assignment_id opcional (liga o repo à atividade Unity)
-- - backfill de class_id → class_unit_id quando a turma tem UC única
--
-- class_id fica por compat na fase 1 (a UI antiga ainda escreve nele). Fase 2
-- remove. Idempotente. Aplicar com: npx supabase db push
-- =============================================================================

alter table public.github_classroom_repos
  add column if not exists class_unit_id uuid references public.class_units(id) on delete cascade,
  add column if not exists assignment_id uuid references public.assignments(id) on delete set null;

create index if not exists github_repos_class_unit_idx on public.github_classroom_repos (class_unit_id);

-- Backfill: repos com class_id e turma de UC única.
do $$
declare r record; v_cu uuid; v_n int;
begin
  for r in select id, class_id from public.github_classroom_repos where class_unit_id is null and class_id is not null loop
    select count(*) into v_n from public.class_units cu where cu.class_id = r.class_id;
    select cu.id into v_cu from public.class_units cu where cu.class_id = r.class_id order by cu.created_at limit 1;
    if v_n = 1 then
      update public.github_classroom_repos set class_unit_id = v_cu where id = r.id;
    end if;
  end loop;
end $$;

-- RLS: professor dono gerencia (já existe por owner_id). Adicionamos leitura
-- pelo aluno membro da UC, para ele ver o status do seu repo Unity na UC.
drop policy if exists "aluno le repos da sua uc" on public.github_classroom_repos;
create policy "aluno le repos da sua uc" on public.github_classroom_repos
  for select using (
    class_unit_id is not null and public.member_of_class_unit(class_unit_id, auth.uid())
  );

select
  exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='github_classroom_repos' and column_name='class_unit_id') as repos_tem_uc,
  (select count(*) from public.github_classroom_repos where class_id is not null and class_unit_id is null) as repos_sem_uc;

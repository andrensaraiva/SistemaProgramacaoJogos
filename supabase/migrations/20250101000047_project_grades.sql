-- =============================================================================
-- Nota/avaliação do PROJETO INTEGRADOR por grupo
-- =============================================================================
-- Cada grupo entrega o seu projeto (board próprio). O professor dono da UC dá
-- uma NOTA (0–10) + FEEDBACK ao projeto de cada grupo. Uma linha por
-- (project, group). Os membros do grupo leem a própria nota; o professor
-- gerencia. Reusa helpers SECURITY DEFINER owns_class_unit / is_group_member.
--
-- Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

create table if not exists public.project_grades (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  group_id uuid not null references public.class_groups(id) on delete cascade,
  grade numeric(4, 1),                     -- 0.0–10.0; null = sem nota ainda
  feedback text,
  graded_by uuid references public.profiles(id) on delete set null,
  graded_at timestamptz,
  unique (project_id, group_id)
);

create index if not exists project_grades_project_idx
  on public.project_grades (project_id, group_id);

alter table public.project_grades enable row level security;

-- Professor dono da UC do projeto gerencia (insere/atualiza a nota).
drop policy if exists "dono gerencia notas do projeto" on public.project_grades;
create policy "dono gerencia notas do projeto" on public.project_grades
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_grades.project_id
        and public.owns_class_unit(p.class_unit_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_grades.project_id
        and public.owns_class_unit(p.class_unit_id, auth.uid())
    )
  );

-- Aluno membro do grupo lê a nota/feedback do próprio grupo.
drop policy if exists "aluno le nota do seu grupo" on public.project_grades;
create policy "aluno le nota do seu grupo" on public.project_grades
  for select using (public.is_group_member(group_id, auth.uid()));

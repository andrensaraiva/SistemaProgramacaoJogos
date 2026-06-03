-- =============================================================================
-- Projeto Integrador (TCC) — projeto → sprints → board de tarefas por grupo
-- =============================================================================
-- No SENAI o projeto integrador é o projeto de fim de curso. O professor pode
-- iniciá-lo cedo ou deixar para o fim, então ele é uma ATIVIDADE da UC
-- (assignment kind='projeto_integrador', migration 0015) — criada quando quiser.
--
-- Sobre essa atividade montamos:
--   PROJECT (1:1 com o assignment) — descrição/objetivo do projeto.
--    └─ SPRINT (faixas de tempo definidas pelo professor)
--    └─ BOARD por GRUPO: cada class_group tem suas TASKS (cards) com status
--       (a_fazer/fazendo/concluido), responsável, sprint e ordem na coluna.
--
-- Permissões:
--   - Professor dono da turma gerencia projeto, sprints e vê todos os boards.
--   - Alunos membros do grupo (is_group_member) gerenciam os cards do SEU grupo.
--
-- Reusa helpers SECURITY DEFINER: owns_class_unit / is_group_member (já existem).
-- Aditiva e idempotente. Aplicar com: npx supabase db push
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PROJECT — 1:1 com a atividade (assignment) de tipo projeto_integrador
-- -----------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.assignments(id) on delete cascade,
  class_unit_id uuid not null references public.class_units(id) on delete cascade,
  title text not null,
  description text,                       -- markdown: objetivo, entregas, critérios
  created_at timestamptz not null default now()
);
create index if not exists projects_class_unit_idx on public.projects (class_unit_id);

-- -----------------------------------------------------------------------------
-- 2. SPRINT — faixas de tempo do projeto (definidas pelo professor)
-- -----------------------------------------------------------------------------
create table if not exists public.project_sprints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,                    -- ex: "Sprint 1 — Levantamento"
  goal text,
  starts_on date,
  ends_on date,
  ord integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists project_sprints_project_idx on public.project_sprints (project_id, ord);

-- -----------------------------------------------------------------------------
-- 3. TASK (card) — board por grupo
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.task_status as enum ('a_fazer', 'fazendo', 'concluido');
exception when duplicate_object then null; end $$;

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  group_id uuid not null references public.class_groups(id) on delete cascade,
  sprint_id uuid references public.project_sprints(id) on delete set null,
  title text not null,
  description text,
  status public.task_status not null default 'a_fazer',
  assignee_id uuid references public.profiles(id) on delete set null,
  ord integer not null default 0,         -- ordem dentro da coluna (status)
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists project_tasks_board_idx
  on public.project_tasks (project_id, group_id, status, ord);

-- -----------------------------------------------------------------------------
-- 4. RLS
-- -----------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.project_sprints enable row level security;
alter table public.project_tasks enable row level security;

-- Helper: a tarefa é de um grupo do qual o usuário é membro? (encapsula o join
-- tasks→group para evitar reescrever is_group_member com o group_id em policy.)
-- is_group_member(group, uid) já existe; usamos direto abaixo.

-- --- PROJECTS: professor dono da UC gerencia; aluno membro da turma lê.
drop policy if exists "dono gerencia projetos" on public.projects;
create policy "dono gerencia projetos" on public.projects
  for all using (public.owns_class_unit(class_unit_id, auth.uid()))
  with check (public.owns_class_unit(class_unit_id, auth.uid()));

drop policy if exists "aluno le projetos da sua uc" on public.projects;
create policy "aluno le projetos da sua uc" on public.projects
  for select using (public.member_of_class_unit(class_unit_id, auth.uid()));

-- --- SPRINTS: dono gerencia; aluno membro da UC lê (via projeto).
drop policy if exists "dono gerencia sprints" on public.project_sprints;
create policy "dono gerencia sprints" on public.project_sprints
  for all using (exists (
    select 1 from public.projects p
    where p.id = project_id and public.owns_class_unit(p.class_unit_id, auth.uid())
  )) with check (exists (
    select 1 from public.projects p
    where p.id = project_id and public.owns_class_unit(p.class_unit_id, auth.uid())
  ));

drop policy if exists "aluno le sprints da sua uc" on public.project_sprints;
create policy "aluno le sprints da sua uc" on public.project_sprints
  for select using (exists (
    select 1 from public.projects p
    where p.id = project_id and public.member_of_class_unit(p.class_unit_id, auth.uid())
  ));

-- --- TASKS (cards):
--   - Professor dono da UC: leitura/escrita total (acompanha e ajusta boards).
--   - Aluno membro do grupo: leitura/escrita dos cards do seu grupo.
drop policy if exists "dono gerencia tasks" on public.project_tasks;
create policy "dono gerencia tasks" on public.project_tasks
  for all using (exists (
    select 1 from public.projects p
    where p.id = project_id and public.owns_class_unit(p.class_unit_id, auth.uid())
  )) with check (exists (
    select 1 from public.projects p
    where p.id = project_id and public.owns_class_unit(p.class_unit_id, auth.uid())
  ));

drop policy if exists "grupo le tasks do seu board" on public.project_tasks;
create policy "grupo le tasks do seu board" on public.project_tasks
  for select using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "grupo cria tasks no seu board" on public.project_tasks;
create policy "grupo cria tasks no seu board" on public.project_tasks
  for insert with check (public.is_group_member(group_id, auth.uid()));

drop policy if exists "grupo edita tasks do seu board" on public.project_tasks;
create policy "grupo edita tasks do seu board" on public.project_tasks
  for update using (public.is_group_member(group_id, auth.uid()))
  with check (public.is_group_member(group_id, auth.uid()));

drop policy if exists "grupo apaga tasks do seu board" on public.project_tasks;
create policy "grupo apaga tasks do seu board" on public.project_tasks
  for delete using (public.is_group_member(group_id, auth.uid()));

-- -----------------------------------------------------------------------------
-- 5. Verificação
-- -----------------------------------------------------------------------------
select
  (select count(*) from information_schema.tables
    where table_schema='public' and table_name in ('projects','project_sprints','project_tasks')) as tabelas_projeto,
  exists (select 1 from pg_type where typname='task_status') as enum_status_ok,
  (select count(*) from pg_policies where tablename='project_tasks') as policies_tasks;

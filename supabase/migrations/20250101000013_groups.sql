-- =============================================================================
-- Grupos de alunos por turma (para trabalhos em grupo)
-- =============================================================================
-- O professor monta grupos dentro da turma. Exercícios com is_group=true são
-- entregues uma vez pelo grupo (submissions.group_id) e a nota vale para todos.
--
-- RLS sem recursão: usa as funções SECURITY DEFINER existentes
-- (is_class_owner / is_class_member). Idempotente. Aplicar com: npx supabase db push
-- =============================================================================

create table if not exists public.class_groups (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists class_groups_class_idx on public.class_groups (class_id);

create table if not exists public.class_group_members (
  group_id uuid not null references public.class_groups(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  primary key (group_id, student_id)
);
create index if not exists class_group_members_student_idx on public.class_group_members (student_id);

-- FK tardia de submissions.group_id (a coluna foi criada na migration 0012).
do $$ begin
  alter table public.submissions
    add constraint submissions_group_id_fkey
    foreign key (group_id) references public.class_groups(id) on delete set null;
exception when duplicate_object then null; end $$;

-- RLS
alter table public.class_groups enable row level security;
alter table public.class_group_members enable row level security;

-- Dono da turma gerencia os grupos; aluno lê os grupos da sua turma.
drop policy if exists "dono gerencia grupos" on public.class_groups;
create policy "dono gerencia grupos" on public.class_groups
  for all using (public.is_class_owner(class_id, auth.uid()))
  with check (public.is_class_owner(class_id, auth.uid()));

drop policy if exists "aluno le grupos da sua turma" on public.class_groups;
create policy "aluno le grupos da sua turma" on public.class_groups
  for select using (public.is_class_member(class_id, auth.uid()));

-- Membros do grupo: dono da turma gerencia; aluno vê os membros dos grupos da
-- sua turma. Resolve a turma via class_groups (função definer evita recursão).
drop policy if exists "dono gerencia membros do grupo" on public.class_group_members;
create policy "dono gerencia membros do grupo" on public.class_group_members
  for all using (exists (
    select 1 from public.class_groups g
    where g.id = class_group_members.group_id
      and public.is_class_owner(g.class_id, auth.uid())
  )) with check (exists (
    select 1 from public.class_groups g
    where g.id = class_group_members.group_id
      and public.is_class_owner(g.class_id, auth.uid())
  ));

drop policy if exists "aluno le membros do seu grupo" on public.class_group_members;
create policy "aluno le membros do seu grupo" on public.class_group_members
  for select using (exists (
    select 1 from public.class_groups g
    where g.id = class_group_members.group_id
      and public.is_class_member(g.class_id, auth.uid())
  ));

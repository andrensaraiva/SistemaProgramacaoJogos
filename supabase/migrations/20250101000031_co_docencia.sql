-- =============================================================================
-- Co-docência na turma + feedback anônimo — Celeste Academy
-- =============================================================================
-- (1) Uma turma pode ter VÁRIOS professores. Mantém-se o dono (owner_id,
--     criador/principal) e adiciona-se class_teachers (co-professores). Os
--     helpers de RLS centralizados passam a aceitar co-professores, propagando
--     o acesso (frequência, atividades, relatórios) sem tocar cada policy.
-- (2) Cada class_units (turma×UC) ganha teacher_id = responsável pela UC
--     (trocável = substituição). Todos os professores VEEM tudo; o responsável
--     é só para clareza/relatórios.
-- (3) teacher_feedback: aluno avalia o professor (estrelas + comentário), geral
--     (UC) ou por aula. ANÔNIMO DE VERDADE: sem coluna de autor; a deduplicação
--     usa um hash calculado no servidor (segredo em env), nunca o student_id.
--
-- Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Co-professores da turma
-- -----------------------------------------------------------------------------
create table if not exists public.class_teachers (
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (class_id, teacher_id)
);
create index if not exists class_teachers_teacher_idx on public.class_teachers (teacher_id);

-- Responsável pela UC (turma×UC). Null = cai no dono da turma.
alter table public.class_units
  add column if not exists teacher_id uuid references public.profiles(id) on delete set null;

-- -----------------------------------------------------------------------------
-- 2. Helpers SECURITY DEFINER — estendidos para co-docência
-- -----------------------------------------------------------------------------

-- "uid é co-professor (não-dono) desta turma?"
create or replace function public.is_class_teacher(target_class uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.class_teachers ct
    where ct.class_id = target_class and ct.teacher_id = uid)
$$;

-- "uid GERENCIA a turma?" = dono OU co-professor. (Nome mantido por compat: já é
-- usado em dezenas de policies como 'dono'.)
create or replace function public.is_class_owner(target_class uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classes c where c.id = target_class and c.owner_id = uid)
      or public.is_class_teacher(target_class, uid)
$$;

-- "uid leciona a UC?" = dono OU co-professor da turma da UC (todos veem tudo).
create or replace function public.owns_class_unit(target_class_unit uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.class_units cu
    join public.classes c on c.id = cu.class_id
    where cu.id = target_class_unit
      and (c.owner_id = uid or public.is_class_teacher(c.id, uid)))
$$;

-- "uid é o RESPONSÁVEL pela UC?" (responsável explícito; cai no dono se null).
create or replace function public.is_uc_responsible(target_class_unit uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.class_units cu
    join public.classes c on c.id = cu.class_id
    where cu.id = target_class_unit
      and coalesce(cu.teacher_id, c.owner_id) = uid)
$$;

-- "prof ensina o aluno?" = dono OU co-professor de alguma turma do aluno.
create or replace function public.teaches_student(prof uuid, student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.class_members m
    join public.classes c on c.id = m.class_id
    where m.student_id = student
      and (c.owner_id = prof or public.is_class_teacher(c.id, prof)))
$$;

-- aluno ↔ professor (inclui co-professores) — para profiles compartilharem turma.
create or replace function public.shares_class_with(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    -- ambos membros (alunos) da mesma turma
    select 1
    from public.class_members m1
    join public.class_members m2 on m2.class_id = m1.class_id
    where m1.student_id = a and m2.student_id = b
    union all
    -- a (aluno) e b (dono ou co-professor da turma de a)
    select 1
    from public.class_members m
    join public.classes c on c.id = m.class_id
    where m.student_id = a and (c.owner_id = b or public.is_class_teacher(c.id, b))
    union all
    -- a (dono ou co-professor) e b (aluno da turma de a)
    select 1
    from public.classes c
    join public.class_members m on m.class_id = c.id
    where m.student_id = b and (c.owner_id = a or public.is_class_teacher(c.id, a))
    union all
    -- a e b são ambos professores (dono/co) da mesma turma
    select 1 from public.classes c
    where (c.owner_id = a or public.is_class_teacher(c.id, a))
      and (c.owner_id = b or public.is_class_teacher(c.id, b))
  )
$$;

-- -----------------------------------------------------------------------------
-- 3. RLS de class_teachers
-- -----------------------------------------------------------------------------
alter table public.class_teachers enable row level security;

-- Admin e dono gerenciam (inserir/remover co-professores).
drop policy if exists "admin e dono gerenciam co-professores" on public.class_teachers;
create policy "admin e dono gerenciam co-professores" on public.class_teachers
  for all using (
    public.is_admin(auth.uid())
    or exists (select 1 from public.classes c where c.id = class_id and c.owner_id = auth.uid())
  ) with check (
    public.is_admin(auth.uid())
    or exists (select 1 from public.classes c where c.id = class_id and c.owner_id = auth.uid())
  );

-- Professores da turma (dono ou co) leem a lista de colegas.
drop policy if exists "professores da turma leem co-professores" on public.class_teachers;
create policy "professores da turma leem co-professores" on public.class_teachers
  for select using (public.is_class_owner(class_id, auth.uid()) or public.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- 4. Feedback anônimo dos alunos sobre os professores
-- -----------------------------------------------------------------------------
create table if not exists public.teacher_feedback (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade, -- alvo
  class_unit_id uuid references public.class_units(id) on delete set null,
  session_id uuid references public.attendance_sessions(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  -- marcador anti-voto-duplo (hash com segredo no servidor; SEM o aluno).
  dedupe_hash text not null unique
);
create index if not exists teacher_feedback_target_idx on public.teacher_feedback (teacher_id);

alter table public.teacher_feedback enable row level security;

-- Inserção: feita pela server action via service-role (valida matrícula no
-- servidor). Nenhuma policy de insert para usuários comuns (anon/auth) — fica
-- bloqueado por padrão; service-role ignora RLS.

-- Leitura: o professor-alvo vê os SEUS feedbacks; admin vê todos. (Sem autor.)
drop policy if exists "professor le seu feedback" on public.teacher_feedback;
create policy "professor le seu feedback" on public.teacher_feedback
  for select using (teacher_id = auth.uid() or public.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- Verificação
-- -----------------------------------------------------------------------------
select
  exists (select 1 from pg_tables where tablename = 'class_teachers') as ct_ok,
  exists (select 1 from information_schema.columns
          where table_name = 'class_units' and column_name = 'teacher_id') as resp_ok,
  exists (select 1 from pg_tables where tablename = 'teacher_feedback') as fb_ok,
  exists (select 1 from pg_proc where proname = 'is_class_teacher') as helper_ok;

-- =============================================================================
-- Coordenador (helpers RLS) + Salas/ambientes — Celeste Academy
-- =============================================================================
-- O coordenador gerencia QUALQUER turma. Estendemos os helpers SECURITY DEFINER
-- centralizados para incluí-lo — propaga acesso a calendário, alunos, atividades
-- e relatórios sem tocar cada policy. E criamos as salas + sala por dia.
--
-- Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper: uid é coordenador?
-- -----------------------------------------------------------------------------
create or replace function public.is_coordenador(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = uid and role = 'coordenador')
$$;

-- -----------------------------------------------------------------------------
-- 2. Helpers estendidos — coordenador entra como "gestão de qualquer turma"
-- -----------------------------------------------------------------------------

-- "gerencia esta turma?" = dono OU co-professor OU coordenador OU admin.
create or replace function public.is_class_owner(target_class uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classes c where c.id = target_class and c.owner_id = uid)
      or public.is_class_teacher(target_class, uid)
      or public.is_coordenador(uid)
      or public.is_admin(uid)
$$;

-- "é professor/gestão?" (usado em leituras institucionais) = professor/admin/coordenador.
create or replace function public.is_professor(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = uid
                 and role in ('professor', 'admin', 'coordenador'))
$$;

-- "ensina o aluno?" — coordenador enxerga todos (para relatórios/perfis).
create or replace function public.teaches_student(prof uuid, student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_coordenador(prof)
      or public.is_admin(prof)
      or exists (
        select 1
        from public.class_members m
        join public.classes c on c.id = m.class_id
        where m.student_id = student
          and (c.owner_id = prof or public.is_class_teacher(c.id, prof)))
$$;

-- aluno ↔ professor — coordenador compartilha turma com qualquer aluno.
create or replace function public.shares_class_with(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    -- coordenador/admin enxerga qualquer um dos lados
    (public.is_coordenador(a) or public.is_admin(a))
    or (public.is_coordenador(b) or public.is_admin(b))
    or exists (
      select 1 from public.class_members m1
      join public.class_members m2 on m2.class_id = m1.class_id
      where m1.student_id = a and m2.student_id = b
      union all
      select 1 from public.class_members m
      join public.classes c on c.id = m.class_id
      where m.student_id = a and (c.owner_id = b or public.is_class_teacher(c.id, b))
      union all
      select 1 from public.classes c
      join public.class_members m on m.class_id = c.id
      where m.student_id = b and (c.owner_id = a or public.is_class_teacher(c.id, a))
      union all
      select 1 from public.classes c
      where (c.owner_id = a or public.is_class_teacher(c.id, a))
        and (c.owner_id = b or public.is_class_teacher(c.id, b))
    )
$$;

-- -----------------------------------------------------------------------------
-- 3. Salas / ambientes
-- -----------------------------------------------------------------------------
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  capacity integer,
  kind text not null default 'sala',   -- sala / laboratorio / auditorio
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

-- Admin e coordenador gerenciam; professores leem.
drop policy if exists "admin e coordenador gerenciam salas" on public.rooms;
create policy "admin e coordenador gerenciam salas" on public.rooms
  for all using (public.is_admin(auth.uid()) or public.is_coordenador(auth.uid()))
  with check (public.is_admin(auth.uid()) or public.is_coordenador(auth.uid()));

drop policy if exists "professor le salas" on public.rooms;
create policy "professor le salas" on public.rooms
  for select using (public.is_professor(auth.uid()));

-- Sala alocada a um dia do calendário.
alter table public.calendar_days
  add column if not exists room_id uuid references public.rooms(id) on delete set null;

-- -----------------------------------------------------------------------------
-- Verificação
-- -----------------------------------------------------------------------------
select
  exists (select 1 from pg_proc where proname = 'is_coordenador') as coord_ok,
  exists (select 1 from pg_tables where tablename = 'rooms') as rooms_ok,
  exists (select 1 from information_schema.columns
          where table_name = 'calendar_days' and column_name = 'room_id') as room_col_ok;

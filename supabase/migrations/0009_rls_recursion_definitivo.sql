-- =============================================================================
-- Fix DEFINITIVO — elimina TODA recursão de RLS entre profiles/classes/class_members
-- =============================================================================
-- A 0008 corrigiu 3 policies, mas o erro "stack depth limit exceeded" persistiu
-- (inclusive deixando o login lento, pois carregar o profile dispara a cadeia).
--
-- Aqui reescrevemos TODAS as policies dessas três tabelas para que nenhuma
-- consulte outra tabela com RLS diretamente — sempre via funções SECURITY
-- DEFINER (que leem sem reavaliar RLS). Sem ciclo possível.
--
-- Idempotente. Rode INTEIRO no SQL Editor do Supabase.
-- =============================================================================

-- 1. Funções auxiliares (recriadas para garantir que existem e estão corretas).
create or replace function public.is_class_owner(target_class uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classes c where c.id = target_class and c.owner_id = uid)
$$;

create or replace function public.is_class_member(target_class uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.class_members m
    where m.class_id = target_class and m.student_id = uid)
$$;

-- is_professor já existe; recriamos por segurança como SECURITY DEFINER também,
-- para que ler profiles dentro de outras policies nunca reavalie o RLS de profiles.
create or replace function public.is_professor(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = uid and role in ('professor', 'admin'))
$$;

-- "O professor é dono de ALGUMA turma do aluno alvo?" — encapsula o cruzamento
-- profiles↔class_members↔classes numa única função definer.
create or replace function public.teaches_student(prof uuid, student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.class_members m
    join public.classes c on c.id = m.class_id
    where m.student_id = student and c.owner_id = prof)
$$;

-- 2. PROFILES — limpa e recria.
drop policy if exists "ler proprio perfil" on public.profiles;
drop policy if exists "professor le perfis dos alunos das suas turmas" on public.profiles;
drop policy if exists "atualizar proprio perfil" on public.profiles;

create policy "ler proprio perfil" on public.profiles
  for select using (auth.uid() = id);
create policy "professor le perfis dos alunos das suas turmas" on public.profiles
  for select using (public.teaches_student(auth.uid(), profiles.id));
create policy "atualizar proprio perfil" on public.profiles
  for update using (auth.uid() = id);

-- 3. CLASSES — limpa e recria.
drop policy if exists "dono gerencia classes" on public.classes;
drop policy if exists "aluno le classes em que esta" on public.classes;

create policy "dono gerencia classes" on public.classes
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "aluno le classes em que esta" on public.classes
  for select using (public.is_class_member(classes.id, auth.uid()));

-- 4. CLASS_MEMBERS — limpa e recria.
drop policy if exists "aluno se inscreve" on public.class_members;
drop policy if exists "aluno ve sua matricula" on public.class_members;
drop policy if exists "dono ve membros" on public.class_members;

create policy "aluno se inscreve" on public.class_members
  for insert with check (auth.uid() = student_id);
create policy "aluno ve sua matricula" on public.class_members
  for select using (auth.uid() = student_id);
create policy "dono ve membros" on public.class_members
  for select using (public.is_class_owner(class_members.class_id, auth.uid()));

-- 5. Verificação — lista as policies dessas três tabelas e confirma as funções.
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'classes', 'class_members')
order by tablename, policyname;

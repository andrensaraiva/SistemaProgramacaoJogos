-- =============================================================================
-- Fix — recursão infinita de RLS entre `classes` e `class_members`
-- =============================================================================
-- Sintoma: "infinite recursion detected in policy for relation class_members".
--
-- Causa: a policy de `classes` ("aluno le classes em que esta") consultava
-- `class_members`, e a policy de `class_members` ("dono ve membros") consultava
-- `classes`. Cada SELECT disparava o avaliador de RLS da outra tabela, em loop.
--
-- Correção: funções SECURITY DEFINER que leem as tabelas SEM reavaliar RLS,
-- quebrando o ciclo. As policies passam a chamar essas funções.
--
-- Idempotente: pode rodar mais de uma vez. Rode no SQL Editor do Supabase.
-- =============================================================================

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

-- classes — leitura do aluno via função (não toca mais o RLS de class_members).
drop policy if exists "aluno le classes em que esta" on public.classes;
create policy "aluno le classes em que esta" on public.classes for select using (
  public.is_class_member(classes.id, auth.uid()));

-- class_members — leitura do dono via função (não toca mais o RLS de classes).
drop policy if exists "dono ve membros" on public.class_members;
create policy "dono ve membros" on public.class_members for select using (
  public.is_class_owner(class_members.class_id, auth.uid()));

-- profiles — a leitura do professor também cruzava as duas tabelas.
drop policy if exists "professor le perfis dos alunos das suas turmas" on public.profiles;
create policy "professor le perfis dos alunos das suas turmas" on public.profiles for select using (
  public.is_professor(auth.uid()) and exists (
    select 1 from public.class_members cm
    where cm.student_id = profiles.id and public.is_class_owner(cm.class_id, auth.uid())));

-- Verificação
select
  exists (select 1 from pg_proc where proname = 'is_class_owner')  as fn_owner_ok,
  exists (select 1 from pg_proc where proname = 'is_class_member') as fn_member_ok;

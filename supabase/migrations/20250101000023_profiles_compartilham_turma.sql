-- =============================================================================
-- Profiles: ler quem compartilha turma (aluno vê o professor e os colegas)
-- =============================================================================
-- Bug: ao abrir uma turma como ALUNO, o nome do professor (owner) vinha null e
-- a tela quebrava — porque o RLS de profiles só permitia: ler o próprio perfil
-- ou (professor) ler seus alunos. Faltava o caminho inverso: o aluno ler o perfil
-- do professor da turma e dos colegas.
--
-- Adiciona a função SECURITY DEFINER shares_class_with(a, b) — "a e b participam
-- de uma mesma turma?" (como dono OU como membro) — e uma policy de SELECT em
-- profiles usando-a. Sem recursão (a função lê sem reavaliar RLS).
--
-- Corrige de uma vez: página da turma (nome do prof), lista de membros e ranking
-- vistos pelo aluno. Idempotente. Aplicar: npx supabase db push
-- =============================================================================

create or replace function public.shares_class_with(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    -- mesma turma: ambos membros
    select 1
    from public.class_members m1
    join public.class_members m2 on m2.class_id = m1.class_id
    where m1.student_id = a and m2.student_id = b
    union all
    -- a é membro de uma turma cujo dono é b (aluno -> professor)
    select 1
    from public.class_members m
    join public.classes c on c.id = m.class_id
    where m.student_id = a and c.owner_id = b
    union all
    -- a é dono de uma turma da qual b é membro (professor -> aluno; redundante
    -- com teaches_student, mas mantém a relação simétrica)
    select 1
    from public.classes c
    join public.class_members m on m.class_id = c.id
    where c.owner_id = a and m.student_id = b
  )
$$;

drop policy if exists "ler perfis de quem compartilha turma" on public.profiles;
create policy "ler perfis de quem compartilha turma" on public.profiles
  for select using (public.shares_class_with(auth.uid(), profiles.id));

-- Verificação
select
  exists (select 1 from pg_proc where proname = 'shares_class_with') as funcao_ok,
  exists (select 1 from pg_policies where tablename = 'profiles'
            and policyname = 'ler perfis de quem compartilha turma') as policy_ok;

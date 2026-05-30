-- =============================================================================
-- Frequência do aluno — permitir que o aluno leia as aulas (sessions) da turma
-- =============================================================================
-- O aluno já pode ler suas próprias marcas (attendance_marks) e as UCs da turma
-- (class_units), mas NÃO as attendance_sessions (só o dono lia). Sem isso, ele
-- não consegue ver a data/número/rótulo das aulas na própria visão de frequência.
--
-- Esta policy libera a leitura das sessions das turmas em que ele está
-- matriculado, usando a função SECURITY DEFINER is_class_member (sem recursão).
-- Idempotente. Rode no SQL Editor do Supabase.
-- =============================================================================

drop policy if exists "aluno le sessoes da sua turma" on public.attendance_sessions;
create policy "aluno le sessoes da sua turma" on public.attendance_sessions
  for select using (exists (
    select 1 from public.class_units cu
    where cu.id = attendance_sessions.class_unit_id
      and public.is_class_member(cu.class_id, auth.uid())
  ));

-- Verificação
select policyname from pg_policies
where schemaname = 'public' and tablename = 'attendance_sessions'
order by policyname;

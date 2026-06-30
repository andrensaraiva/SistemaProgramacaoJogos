-- =============================================================================
-- Exercício visível para quem está na turma onde ele foi atribuído
-- =============================================================================
-- A policy original ("ler exercicios publicos", migration 0001) só libera SELECT
-- quando `is_public` OU `author_id = auth.uid()`. O comentário daquela migration
-- prometia também "disponível em uma turma do aluno/professor", mas essa cláusula
-- nunca existiu. Resultado: um exercício NÃO público anexado a uma lista é lido
-- pelo aluno no vínculo (assignment_exercises), mas o embed do próprio exercício
-- volta null por RLS — quebrando/zerando a tela da lista.
--
-- Aqui adicionamos uma policy PERMISSIVA extra (as policies de SELECT são OR):
-- pode ler o exercício quem é dono OU membro de alguma turma em que ele está
-- atribuído. Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

drop policy if exists "ler exercicios da minha turma" on public.exercises;
create policy "ler exercicios da minha turma" on public.exercises
  for select using (
    exists (
      select 1
      from public.assignment_exercises ae
      join public.assignments a on a.id = ae.assignment_id
      where ae.exercise_id = exercises.id
        and (
          exists (
            select 1 from public.classes c
            where c.id = a.class_id and c.owner_id = auth.uid()
          )
          or exists (
            select 1 from public.class_members cm
            where cm.class_id = a.class_id and cm.student_id = auth.uid()
          )
        )
    )
  );

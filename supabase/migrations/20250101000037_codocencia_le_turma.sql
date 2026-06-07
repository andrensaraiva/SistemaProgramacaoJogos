-- =============================================================================
-- Co-docência lê a turma — Celeste Academy (bugfix)
-- =============================================================================
-- A migration de co-docência (0031) estendeu o helper is_class_owner (que passou
-- a incluir co-professor), mas NÃO adicionou uma policy de SELECT em `classes`
-- para o co-professor. Resultado: o co-professor lia class_teachers (pegava o
-- class_id) mas a query em `classes` voltava vazia pelo RLS → "Nenhuma turma".
--
-- Aqui adicionamos a leitura de `classes` para quem gerencia a turma
-- (is_class_owner já cobre dono + co-docente + coordenador + admin).
--
-- Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

drop policy if exists "gestao da turma le a turma" on public.classes;
create policy "gestao da turma le a turma" on public.classes
  for select using (public.is_class_owner(classes.id, auth.uid()));

-- Verificação
select exists (
  select 1 from pg_policies
  where tablename = 'classes' and policyname = 'gestao da turma le a turma'
) as policy_ok;

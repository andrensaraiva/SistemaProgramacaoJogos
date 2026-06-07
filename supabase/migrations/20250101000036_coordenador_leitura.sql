-- =============================================================================
-- Coordenador — leitura ampla via cliente RLS — Celeste Academy
-- =============================================================================
-- O coordenador supervisiona qualquer turma e precisa LER classes/membros/UCs
-- pelo cliente RLS (telas de turma e lista /turmas). Policies aditivas de SELECT
-- para gestão (coordenador/admin). As policies de escrita já passam por
-- is_class_owner estendido (mig 0035).
--
-- Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

drop policy if exists "gestao le todas as classes" on public.classes;
create policy "gestao le todas as classes" on public.classes
  for select using (public.is_coordenador(auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "gestao le todos os membros" on public.class_members;
create policy "gestao le todos os membros" on public.class_members
  for select using (public.is_coordenador(auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "gestao le class_units" on public.class_units;
create policy "gestao le class_units" on public.class_units
  for select using (public.is_coordenador(auth.uid()) or public.is_admin(auth.uid()));

-- =============================================================================
-- Visibilidade da entrega de grupo para todos os membros
-- =============================================================================
-- A submissão de um trabalho em grupo é gravada com o student_id de quem enviou,
-- mas TODOS os membros do grupo devem ver a entrega e a nota. Esta policy libera
-- a leitura de submissões cujo group_id pertença a um grupo do qual o aluno é
-- membro. Usa a função SECURITY DEFINER is_group_member (criada aqui).
--
-- Idempotente. Aplicar com: npx supabase db push
-- =============================================================================

create or replace function public.is_group_member(target_group uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.class_group_members m
    where m.group_id = target_group and m.student_id = uid)
$$;

drop policy if exists "aluno ve entrega do seu grupo" on public.submissions;
create policy "aluno ve entrega do seu grupo" on public.submissions
  for select using (
    group_id is not null and public.is_group_member(group_id, auth.uid())
  );

-- =============================================================================
-- Realtime no board do projeto integrador (project_tasks)
-- =============================================================================
-- Habilita o Supabase Realtime na tabela de cards pra que os membros do grupo
-- vejam movimentações/criações/exclusões ao vivo no board (drag-and-drop em
-- tempo real). A RLS já restringe quem lê (membros do grupo + professor dono),
-- e o Realtime respeita a RLS, então cada aluno só recebe eventos do seu board.
--
-- `replica identity full` faz o evento de UPDATE/DELETE trazer a linha inteira
-- (inclui group_id antigo), necessário pro cliente filtrar por grupo.
-- Idempotente. Aplicar: npx supabase db push
-- =============================================================================

alter table public.project_tasks replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'project_tasks'
  ) then
    alter publication supabase_realtime add table public.project_tasks;
  end if;
end $$;

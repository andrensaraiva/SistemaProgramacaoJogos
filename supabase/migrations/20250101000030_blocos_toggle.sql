-- =============================================================================
-- Exercício de blocos — toggle de governança
-- =============================================================================
-- O admin liga/desliga a ferramenta de blocos (institution_settings).
-- Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

alter table public.institution_settings
  add column if not exists tool_blocos boolean not null default true;

select exists (
  select 1 from information_schema.columns
  where table_name = 'institution_settings' and column_name = 'tool_blocos'
) as toggle_ok;

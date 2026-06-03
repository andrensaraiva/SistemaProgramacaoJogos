-- =============================================================================
-- SAP prático — entrega do aluno em sap_evaluations
-- =============================================================================
-- A migration 0021 criou sap_evaluations sem as colunas de entrega numa primeira
-- aplicação. Esta migration adiciona (idempotente) o link de entrega do aluno e o
-- carimbo de quando entregou. A entrega é escrita pela app (admin client) após
-- verificar matrícula; o aluno lê a própria avaliação (RLS de 0021).
-- Aplicar: npx supabase db push
-- =============================================================================

alter table public.sap_evaluations
  add column if not exists submission_link text,
  add column if not exists submitted_at timestamptz;

select
  exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='sap_evaluations'
      and column_name='submission_link') as tem_submission_link;

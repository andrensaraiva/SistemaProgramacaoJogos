-- =============================================================================
-- Sufixo da senha derivada — Celeste Academy
-- =============================================================================
-- A senha inicial deixa de ser aleatória e passa a ser DERIVADA do usuário:
-- PrimeiroNome + sufixo (ex.: "Joao@2026"). Mais fácil de comunicar em massa;
-- a troca no 1º acesso continua obrigatória. O sufixo é configurável pelo admin.
--
-- Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

alter table public.institution_settings
  add column if not exists senha_sufixo text not null default '@2026';

-- Verificação
select exists (
  select 1 from information_schema.columns
  where table_name = 'institution_settings' and column_name = 'senha_sufixo'
) as col_ok;

-- =============================================================================
-- Suspensão de contas (admin) — Celeste Academy
-- =============================================================================
-- O admin pode SUSPENDER uma conta (professor ou aluno) em vez de excluí-la, para
-- preservar o histórico acadêmico (submissões, notas, frequência). Suspender =
-- gravar disabled_at; reativar = limpar. O bloqueio efetivo do login acontece no
-- middleware/login da app.
--
-- Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

alter table public.profiles
  add column if not exists disabled_at timestamptz;

-- Verificação
select exists (
  select 1 from information_schema.columns
  where table_name = 'profiles' and column_name = 'disabled_at'
) as disabled_at_ok;

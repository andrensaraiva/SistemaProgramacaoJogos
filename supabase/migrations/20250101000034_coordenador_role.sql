-- =============================================================================
-- Papel COORDENADOR — Celeste Academy
-- =============================================================================
-- Novo nível na hierarquia (entre professor e admin): supervisiona a operação,
-- vê/gerencia QUALQUER turma como um dono. Enum em arquivo próprio (ADD VALUE
-- tem restrição de transação); helpers/RLS na 0035.
--
-- Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

alter type public.user_role add value if not exists 'coordenador';

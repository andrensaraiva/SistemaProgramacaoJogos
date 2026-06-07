-- =============================================================================
-- Exercícios criativos (1/2): novos tipos no enum exercise_type
-- =============================================================================
-- Separado em migration própria porque ALTER TYPE ... ADD VALUE tem restrições
-- de transação no Postgres. As colunas/Storage/policies ficam na 0028.
--
-- Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

alter type public.exercise_type add value if not exists 'pixel_art';
alter type public.exercise_type add value if not exists 'vetor';
alter type public.exercise_type add value if not exists 'arte_digital';

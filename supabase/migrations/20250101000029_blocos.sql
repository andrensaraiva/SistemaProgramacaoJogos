-- =============================================================================
-- Exercício de blocos (estilo Scratch, mascote Celeste) — enum
-- =============================================================================
-- Novo tipo criativo: programação visual por blocos. Reusa o pipeline dos
-- editores criativos. Enum em arquivo próprio (ADD VALUE tem restrição de
-- transação); o toggle de governança fica na 0030.
--
-- Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

alter type public.exercise_type add value if not exists 'blocos';

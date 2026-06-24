-- =============================================================================
-- Fix: exercises.author_id NOT NULL + ON DELETE SET NULL é inválido
-- =============================================================================
-- A coluna foi criada como `not null` mas a FK usa `on delete set null`
-- (ver 20250101000001_init.sql). Ao deletar um professor autor de exercícios,
-- o Postgres tenta gravar NULL numa coluna NOT NULL e aborta a operação — o
-- GoTrue retorna "Database error deleting user". O SETUP_COMPLETO.sql já tem a
-- coluna correta (nullable); esta migration alinha bancos criados pelas
-- migrations.
--
-- Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

alter table public.exercises
  alter column author_id drop not null;

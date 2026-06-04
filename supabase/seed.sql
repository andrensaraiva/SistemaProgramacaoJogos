-- =============================================================================
-- Seed executado pelo `supabase db reset` (config.toml: [db.seed]).
-- =============================================================================
-- Mantido vazio de propósito: logo após um reset NÃO existe nenhum perfil, e o
-- seed de exercícios (supabase/seed/0001_exercises.sql) exige um autor. A criação
-- de contas (admin master) precisa do Auth e é feita pelo script Node:
--
--   cd web && npm run seed:identidades
--
-- Depois, se quiser os exercícios públicos de exemplo, rode o seed de exercícios
-- pelo SQL Editor (ou crie via UI). Este arquivo só garante que a etapa de seed
-- do reset termine sem erro.
-- =============================================================================

select 1;

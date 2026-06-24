-- =============================================================================
-- Perfil do aluno: cosméticos (moldura do avatar + banner) ganhos por XP/nível
-- =============================================================================
-- Estilo Discord: o aluno desbloqueia molduras e banners conforme sobe de nível
-- e equipa os que já liberou. O CATÁLOGO é definido em código
-- (web/src/lib/cosmetics/registry.ts) — aqui só guardamos o que está equipado,
-- por slug. O desbloqueio é derivado do `profiles.level` (validado no servidor),
-- então não precisamos de tabela de catálogo nem de "posse".
--
-- Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

alter table public.profiles
  add column if not exists banner_id text,
  add column if not exists avatar_frame_id text;

-- A policy "atualizar proprio perfil" (migration 0001) já permite o aluno
-- atualizar o próprio perfil (auth.uid() = id), cobrindo estas colunas. O
-- servidor valida o desbloqueio antes de gravar.

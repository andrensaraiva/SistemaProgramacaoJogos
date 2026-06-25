-- =============================================================================
-- Streak (ofensiva diária) do aluno — gancho de retorno diário
-- =============================================================================
-- Conta quantos dias seguidos o aluno "apareceu" (acessou o painel). A regra de
-- atualização vive no servidor (web/src/lib/gamification/streak.ts):
--   - mesmo dia        → não muda
--   - dia seguinte     → current_streak += 1
--   - pulou um ou mais → current_streak volta a 1
-- `longest_streak` guarda o recorde pessoal (pra motivar a bater). As datas são
-- YYYY-MM-DD (sem fuso) no horário local do aluno, gravadas pelo servidor.
--
-- A policy "atualizar próprio perfil" (migration 0001) já cobre estas colunas
-- (auth.uid() = id). Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

alter table public.profiles
  add column if not exists current_streak integer not null default 0,
  add column if not exists longest_streak integer not null default 0,
  add column if not exists last_active_on date;

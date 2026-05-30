-- =============================================================================
-- Frequência por aula do dia — adiciona "period" às sessões
-- =============================================================================
-- Um dia pode ter várias aulas/tempos (4, 6, varia por turma). Cada aula vira
-- uma attendance_session com a MESMA `date` e um `period` distinto (1ª, 2ª...).
-- Assim o professor marca presença por aula (o aluno pode faltar só a 1ª e a 2ª,
-- ou a 1ª e a última) e a grade agrupa por dia.
--
-- `session_number` global continua existindo (ordem absoluta / compat). O novo
-- `period` é a posição da aula dentro do dia.
--
-- Idempotente. Aplicar com: npx supabase db push
-- =============================================================================

alter table public.attendance_sessions
  add column if not exists period integer not null default 1;

-- Ordena as sessões por dia e período (além do número global).
create index if not exists attendance_sessions_cu_date_period_idx
  on public.attendance_sessions (class_unit_id, date, period);

-- =============================================================================
-- Pesquisa de feedback da UC (anônima) — infraestrutura + decorrer das aulas
-- =============================================================================
-- Quando uma UC termina (data final do calendário passa), o aluno responde uma
-- pesquisa ANÔNIMA sobre a UC: notas 1–5 por tópico (infraestrutura, didática,
-- ritmo, geral) + um comentário livre. O coordenador consome o AGREGADO, sem
-- saber quem respondeu.
--
-- Anonimato de verdade (mesmo padrão do teacher_feedback, ver [[co-docencia-feedback]]):
-- NÃO guardamos student_id. O anti-voto-duplo é um `dedupe_hash` = HMAC(secret,
-- student:class_unit) calculado no servidor com FEEDBACK_SECRET, com UNIQUE.
--
-- Idempotente. Aplicar: npx supabase db push
-- =============================================================================

create table if not exists public.uc_survey_responses (
  id uuid primary key default gen_random_uuid(),
  class_unit_id uuid not null references public.class_units(id) on delete cascade,
  -- notas 1–5 por tópico
  rating_infra smallint check (rating_infra between 1 and 5),
  rating_didatica smallint check (rating_didatica between 1 and 5),
  rating_ritmo smallint check (rating_ritmo between 1 and 5),
  rating_geral smallint check (rating_geral between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  -- marcador anti-voto-duplo (hash com segredo no servidor; SEM o aluno).
  dedupe_hash text not null unique
);
create index if not exists uc_survey_class_unit_idx on public.uc_survey_responses (class_unit_id);

alter table public.uc_survey_responses enable row level security;

-- A inserção é feita pelo servidor (service-role) após validar matrícula +
-- UC encerrada. Não há SELECT para alunos (é anônimo). O coordenador lê pelo
-- agregado via service-role. Deixamos RLS ligado sem policy permissiva de
-- SELECT/INSERT pra clientes — só o service-role acessa.

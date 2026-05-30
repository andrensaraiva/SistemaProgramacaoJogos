-- =============================================================================
-- Fase 7 — Correção manual do professor (estilo SpeedGrader do Canvas)
-- =============================================================================
-- Hoje a submissão só tem nota automática (passou X de Y testes). Falta o
-- professor poder dar uma NOTA MANUAL (0–10), um COMENTÁRIO de feedback, e o
-- aluno ver esse retorno.
--
-- Aditivo e idempotente. Pode rodar mais de uma vez.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Campos de correção manual na submissão
-- -----------------------------------------------------------------------------
alter table public.submissions
  add column if not exists manual_grade numeric(4,2),          -- 0.00 a 10.00 (null = não corrigido)
  add column if not exists manual_feedback text,               -- comentário do professor (markdown)
  add column if not exists graded_by uuid references public.profiles(id) on delete set null,
  add column if not exists graded_at timestamptz;

-- -----------------------------------------------------------------------------
-- 2. RLS — professor dono da turma pode ATUALIZAR (corrigir) submissões
-- -----------------------------------------------------------------------------
-- A submissão se liga à turma via assignment → classes.owner_id.
drop policy if exists "professor corrige submissoes da sua turma" on public.submissions;
create policy "professor corrige submissoes da sua turma" on public.submissions
  for update using (
    public.is_professor(auth.uid()) and exists (
      select 1 from public.assignments a
      join public.classes c on c.id = a.class_id
      where a.id = submissions.assignment_id and c.owner_id = auth.uid()
    )
  )
  with check (
    public.is_professor(auth.uid()) and exists (
      select 1 from public.assignments a
      join public.classes c on c.id = a.class_id
      where a.id = submissions.assignment_id and c.owner_id = auth.uid()
    )
  );

-- O aluno já lê as próprias submissões (policy "aluno ve suas submissoes" da 0001),
-- então o feedback manual aparece automaticamente para ele. Nada a fazer aqui.

-- -----------------------------------------------------------------------------
-- 3. Verificação
-- -----------------------------------------------------------------------------
select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submissions'
      and column_name = 'manual_grade'
  ) as manual_grade_ok,
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'submissions'
      and policyname = 'professor corrige submissoes da sua turma'
  ) as grade_policy_ok;

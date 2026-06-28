-- =============================================================================
-- Tentativa de PROVA (modo prova com lockdown)
-- =============================================================================
-- Uma prova é um assignment kind='prova'. Quando o aluno INICIA, criamos uma
-- tentativa; quando ele SAI DA TELA (troca de aba / perde foco / sai do
-- fullscreen) ou entrega, a prova é finalizada (regra do usuário: sair = entrega).
-- Depois de finalizada, o aluno não pode mais responder.
--
-- `left_screen` registra que a finalização veio por saída da tela (sinal para o
-- professor, junto da base antifraude já existente em submissions).
-- =============================================================================

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  left_screen boolean not null default false,
  unique (assignment_id, student_id)
);

create index if not exists idx_exam_attempts_assignment on public.exam_attempts (assignment_id);

alter table public.exam_attempts enable row level security;

-- O aluno vê e mexe só na própria tentativa.
drop policy if exists "aluno ve sua tentativa de prova" on public.exam_attempts;
create policy "aluno ve sua tentativa de prova" on public.exam_attempts
  for select using (auth.uid() = student_id);

drop policy if exists "aluno cria sua tentativa de prova" on public.exam_attempts;
create policy "aluno cria sua tentativa de prova" on public.exam_attempts
  for insert with check (auth.uid() = student_id);

drop policy if exists "aluno atualiza sua tentativa de prova" on public.exam_attempts;
create policy "aluno atualiza sua tentativa de prova" on public.exam_attempts
  for update using (auth.uid() = student_id);

-- O professor dono da turma da prova vê todas as tentativas (relatório/antifraude).
drop policy if exists "professor ve tentativas da sua prova" on public.exam_attempts;
create policy "professor ve tentativas da sua prova" on public.exam_attempts
  for select using (
    exists (
      select 1
      from public.assignments a
      join public.classes c on c.id = a.class_id
      where a.id = exam_attempts.assignment_id
        and public.is_class_owner(c.id, auth.uid())
    )
  );

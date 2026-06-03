-- =============================================================================
-- SAEP teórico — matriz de competências por curso + banco de questões + simulados
-- =============================================================================
-- O SAEP é a prova TEÓRICA do SENAI (múltipla escolha, formato Contexto+Comando
-- +5 alternativas A-E + justificativa de cada + resolução). As questões mapeiam
-- para a MATRIZ do curso (Capacidades C1-C8, Objetos de conhecimento A-T), que
-- varia por curso — por isso a matriz é DADO, não código.
--
-- Camadas:
--   COMPETENCY_MATRIX (por curso)
--    ├─ competencies        (capacidades, ex C3 "Aplicar lógica de programação")
--    └─ knowledge_objects   (objetos, ex F "Algoritmos e lógica computacional")
--
--   QUIZ_QUESTIONS (banco, do autor; reutilizável)
--    ├─ quiz_options        (A-E, uma correta, justificativa por alternativa)
--    └─ tags p/ competência + objeto (desempenho por competência no dashboard)
--
--   SIMULADO = atividade da UC (assignment kind='saep_simulado') + seleção de
--   questões; ATTEMPT = tentativa do aluno; ANSWER = resposta por questão.
--
-- Reusa helpers SECURITY DEFINER (owns_class_unit / member_of_class_unit) e o
-- padrão de RLS do projeto. Aditiva e idempotente. Aplicar: npx supabase db push
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. MATRIZ DE COMPETÊNCIAS (por curso)
-- -----------------------------------------------------------------------------
create table if not exists public.competency_matrices (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  version text,                          -- ex: "1" / "Itinerário 2021"
  created_at timestamptz not null default now()
);
create index if not exists competency_matrices_course_idx on public.competency_matrices (course_id);

-- Capacidades (C1..C8) — code + descrição.
create table if not exists public.competencies (
  id uuid primary key default gen_random_uuid(),
  matrix_id uuid not null references public.competency_matrices(id) on delete cascade,
  code text not null,                    -- ex: "C3"
  description text not null,
  ord integer not null default 0
);
create index if not exists competencies_matrix_idx on public.competencies (matrix_id, ord);

-- Objetos de conhecimento (A..T) — code + nome.
create table if not exists public.knowledge_objects (
  id uuid primary key default gen_random_uuid(),
  matrix_id uuid not null references public.competency_matrices(id) on delete cascade,
  code text not null,                    -- ex: "F"
  name text not null,                    -- ex: "Algoritmos e lógica computacional"
  ord integer not null default 0
);
create index if not exists knowledge_objects_matrix_idx on public.knowledge_objects (matrix_id, ord);

-- -----------------------------------------------------------------------------
-- 2. BANCO DE QUESTÕES (formato SAEP)
-- -----------------------------------------------------------------------------
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,  -- a qual curso/matriz pertence
  competency_id uuid references public.competencies(id) on delete set null,
  knowledge_object_id uuid references public.knowledge_objects(id) on delete set null,
  contexto text not null,                -- enunciado/situação
  comando text not null,                 -- a pergunta objetiva
  resolucao text,                        -- resolução comentada / passo completo
  difficulty public.difficulty not null default 'medio',
  is_public boolean not null default false,
  generated_by_ai boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists quiz_questions_author_idx on public.quiz_questions (author_id);
create index if not exists quiz_questions_course_idx on public.quiz_questions (course_id);

-- Alternativas (A-E): rótulo, texto, se é correta, justificativa específica.
create table if not exists public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  label text not null,                   -- "A".."E"
  text text not null,
  is_correct boolean not null default false,
  justification text,                    -- por que esta alternativa está certa/errada
  ord integer not null default 0
);
create index if not exists quiz_options_question_idx on public.quiz_options (question_id, ord);

-- -----------------------------------------------------------------------------
-- 3. SIMULADO (vinculado a uma atividade da UC) + seleção de questões
-- -----------------------------------------------------------------------------
-- O simulado é uma atividade kind='saep_simulado' (enum ampliado abaixo). Esta
-- tabela guarda config (tempo) e o vínculo 1:1 com o assignment. Simulado
-- "geral" da turma usa um class_unit; simulado "de UC" idem — a diferença é
-- semântica (qual UC), então não precisamos de coluna extra.
do $$ begin alter type public.assignment_kind add value if not exists 'saep_simulado'; exception when others then null; end $$;

create table if not exists public.quiz_simulados (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.assignments(id) on delete cascade,
  class_unit_id uuid not null references public.class_units(id) on delete cascade,
  title text not null,
  description text,
  time_limit_min integer,                -- tempo cronometrado (null = sem limite)
  show_feedback boolean not null default true,  -- mostra justificativa/resolução após enviar
  created_at timestamptz not null default now()
);
create index if not exists quiz_simulados_class_unit_idx on public.quiz_simulados (class_unit_id);

create table if not exists public.quiz_simulado_questions (
  simulado_id uuid not null references public.quiz_simulados(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  ord integer not null default 0,
  primary key (simulado_id, question_id)
);
create index if not exists quiz_simulado_questions_idx on public.quiz_simulado_questions (simulado_id, ord);

-- -----------------------------------------------------------------------------
-- 4. TENTATIVAS E RESPOSTAS
-- -----------------------------------------------------------------------------
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  simulado_id uuid not null references public.quiz_simulados(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric,                         -- 0..100 (% de acertos), preenchido na entrega
  total_questions integer not null default 0,
  correct_count integer not null default 0,
  unique (simulado_id, student_id)       -- uma tentativa por aluno por simulado
);
create index if not exists quiz_attempts_student_idx on public.quiz_attempts (student_id);
create index if not exists quiz_attempts_simulado_idx on public.quiz_attempts (simulado_id);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  selected_option_id uuid references public.quiz_options(id) on delete set null,
  is_correct boolean,
  answered_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);
create index if not exists quiz_answers_attempt_idx on public.quiz_answers (attempt_id);

-- -----------------------------------------------------------------------------
-- 5. RLS
-- -----------------------------------------------------------------------------
alter table public.competency_matrices enable row level security;
alter table public.competencies enable row level security;
alter table public.knowledge_objects enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_simulados enable row level security;
alter table public.quiz_simulado_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;

-- MATRIZ: professor lê (catálogo compartilhado); autor do curso gerencia (via owns_course).
drop policy if exists "professor le matrizes" on public.competency_matrices;
create policy "professor le matrizes" on public.competency_matrices
  for select using (public.is_professor(auth.uid()));
drop policy if exists "autor gerencia matrizes" on public.competency_matrices;
create policy "autor gerencia matrizes" on public.competency_matrices
  for all using (public.owns_course(course_id)) with check (public.owns_course(course_id));

do $$
declare t text;
begin
  foreach t in array array['competencies','knowledge_objects'] loop
    execute format('drop policy if exists "professor le %1$s" on public.%1$I', t);
    execute format('create policy "professor le %1$s" on public.%1$I for select using (public.is_professor(auth.uid()))', t);
    execute format('drop policy if exists "autor gerencia %1$s" on public.%1$I', t);
    execute format($f$
      create policy "autor gerencia %1$s" on public.%1$I for all
        using (exists (select 1 from public.competency_matrices m
                       where m.id = matrix_id and public.owns_course(m.course_id)))
        with check (exists (select 1 from public.competency_matrices m
                       where m.id = matrix_id and public.owns_course(m.course_id)))
    $f$, t);
  end loop;
end $$;

-- QUESTÕES: pública ou do autor (igual exercises). Alternativas seguem a questão,
-- mas o aluno NÃO deve ver is_correct/justification antes de responder — isso é
-- controlado na camada de leitura (a app só seleciona esses campos para o autor
-- ou após a entrega). A policy garante visibilidade básica.
drop policy if exists "ler questoes publicas ou do autor" on public.quiz_questions;
create policy "ler questoes publicas ou do autor" on public.quiz_questions
  for select using (is_public or author_id = auth.uid());
drop policy if exists "autor gerencia questoes" on public.quiz_questions;
create policy "autor gerencia questoes" on public.quiz_questions
  for all using (author_id = auth.uid()) with check (author_id = auth.uid());

-- Alternativas: legível se a questão for legível; gerenciável pelo autor da questão.
-- (Aluno em simulado lê via service role após responder; ver actions.)
drop policy if exists "ler opcoes de questao visivel" on public.quiz_options;
create policy "ler opcoes de questao visivel" on public.quiz_options
  for select using (exists (
    select 1 from public.quiz_questions q
    where q.id = question_id and (q.is_public or q.author_id = auth.uid())
  ));
drop policy if exists "autor gerencia opcoes" on public.quiz_options;
create policy "autor gerencia opcoes" on public.quiz_options
  for all using (exists (
    select 1 from public.quiz_questions q where q.id = question_id and q.author_id = auth.uid()
  )) with check (exists (
    select 1 from public.quiz_questions q where q.id = question_id and q.author_id = auth.uid()
  ));

-- SIMULADO: professor dono da UC gerencia; aluno membro da UC lê.
drop policy if exists "dono gerencia simulados" on public.quiz_simulados;
create policy "dono gerencia simulados" on public.quiz_simulados
  for all using (public.owns_class_unit(class_unit_id, auth.uid()))
  with check (public.owns_class_unit(class_unit_id, auth.uid()));
drop policy if exists "aluno le simulados da sua uc" on public.quiz_simulados;
create policy "aluno le simulados da sua uc" on public.quiz_simulados
  for select using (public.member_of_class_unit(class_unit_id, auth.uid()));

drop policy if exists "dono gerencia simulado_questions" on public.quiz_simulado_questions;
create policy "dono gerencia simulado_questions" on public.quiz_simulado_questions
  for all using (exists (
    select 1 from public.quiz_simulados s where s.id = simulado_id and public.owns_class_unit(s.class_unit_id, auth.uid())
  )) with check (exists (
    select 1 from public.quiz_simulados s where s.id = simulado_id and public.owns_class_unit(s.class_unit_id, auth.uid())
  ));
drop policy if exists "aluno le simulado_questions da sua uc" on public.quiz_simulado_questions;
create policy "aluno le simulado_questions da sua uc" on public.quiz_simulado_questions
  for select using (exists (
    select 1 from public.quiz_simulados s where s.id = simulado_id and public.member_of_class_unit(s.class_unit_id, auth.uid())
  ));

-- TENTATIVAS: aluno gerencia a própria; professor dono da UC lê (dashboard).
drop policy if exists "aluno gerencia sua tentativa" on public.quiz_attempts;
create policy "aluno gerencia sua tentativa" on public.quiz_attempts
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists "professor le tentativas da sua uc" on public.quiz_attempts;
create policy "professor le tentativas da sua uc" on public.quiz_attempts
  for select using (exists (
    select 1 from public.quiz_simulados s where s.id = simulado_id and public.owns_class_unit(s.class_unit_id, auth.uid())
  ));

-- RESPOSTAS: aluno gerencia as suas (via tentativa própria); professor dono lê.
drop policy if exists "aluno gerencia suas respostas" on public.quiz_answers;
create policy "aluno gerencia suas respostas" on public.quiz_answers
  for all using (exists (
    select 1 from public.quiz_attempts a where a.id = attempt_id and a.student_id = auth.uid()
  )) with check (exists (
    select 1 from public.quiz_attempts a where a.id = attempt_id and a.student_id = auth.uid()
  ));
drop policy if exists "professor le respostas da sua uc" on public.quiz_answers;
create policy "professor le respostas da sua uc" on public.quiz_answers
  for select using (exists (
    select 1 from public.quiz_attempts a
    join public.quiz_simulados s on s.id = a.simulado_id
    where a.id = attempt_id and public.owns_class_unit(s.class_unit_id, auth.uid())
  ));

-- -----------------------------------------------------------------------------
-- 6. Verificação
-- -----------------------------------------------------------------------------
select
  (select count(*) from information_schema.tables where table_schema='public'
    and table_name in ('competency_matrices','competencies','knowledge_objects',
      'quiz_questions','quiz_options','quiz_simulados','quiz_simulado_questions',
      'quiz_attempts','quiz_answers')) as tabelas_saep,
  exists (select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid
          where t.typname='assignment_kind' and e.enumlabel='saep_simulado') as kind_simulado_ok;

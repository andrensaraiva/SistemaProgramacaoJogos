-- =============================================================================
-- Duelo de quiz (SAEP) — X1 de questões teóricas dentro da UC
-- =============================================================================
-- Diferente do duelo de código (duels: quem aprova primeiro vence), o duelo de
-- quiz é: dois alunos respondem o MESMO conjunto de questões SAEP da UC e vence
-- quem acerta mais (desempate por tempo total). O ranking REUSA duel_ratings
-- (por turma × UC), então "quem é o melhor" unifica codigo + quiz na mesma UC.
--
--   QUIZ_DUEL (challenger vs opponent, na UC, com codigo de convite)
--    ├─ QUIZ_DUEL_QUESTIONS  (snapshot das N questoes — iguais p/ os dois, justo)
--    └─ QUIZ_DUEL_ANSWERS    (respostas de cada jogador + acerto + tempo)
--
-- Reusa helpers SECURITY DEFINER (member_of_class_unit / owns_class_unit) e a
-- tabela duel_ratings (migration 0016). Aditiva e idempotente.
-- Aplicar: npx supabase db push
-- =============================================================================

do $$ begin
  create type public.quiz_duel_status as enum ('aguardando', 'em_andamento', 'concluido', 'cancelado');
exception when duplicate_object then null; end $$;

create table if not exists public.quiz_duels (
  id uuid primary key default gen_random_uuid(),
  class_unit_id uuid not null references public.class_units(id) on delete cascade,
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid references public.profiles(id) on delete cascade,
  winner_id uuid references public.profiles(id) on delete set null,
  status public.quiz_duel_status not null default 'aguardando',
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  question_count integer not null default 5,
  -- placar preenchido na conclusão
  challenger_correct integer,
  opponent_correct integer,
  rating_delta integer,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists quiz_duels_class_unit_idx on public.quiz_duels (class_unit_id);
create index if not exists quiz_duels_invite_idx on public.quiz_duels (invite_code);

-- Snapshot das questões do duelo (iguais para ambos).
create table if not exists public.quiz_duel_questions (
  duel_id uuid not null references public.quiz_duels(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  ord integer not null default 0,
  primary key (duel_id, question_id)
);
create index if not exists quiz_duel_questions_idx on public.quiz_duel_questions (duel_id, ord);

-- Respostas de cada jogador.
create table if not exists public.quiz_duel_answers (
  id uuid primary key default gen_random_uuid(),
  duel_id uuid not null references public.quiz_duels(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  selected_option_id uuid references public.quiz_options(id) on delete set null,
  is_correct boolean,
  answered_at timestamptz not null default now(),
  unique (duel_id, player_id, question_id)
);
create index if not exists quiz_duel_answers_idx on public.quiz_duel_answers (duel_id, player_id);

-- Marca se o jogador já terminou de responder (para apurar o vencedor quando
-- ambos concluírem).
create table if not exists public.quiz_duel_finishes (
  duel_id uuid not null references public.quiz_duels(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  correct_count integer not null default 0,
  total_ms integer,
  finished_at timestamptz not null default now(),
  primary key (duel_id, player_id)
);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.quiz_duels enable row level security;
alter table public.quiz_duel_questions enable row level security;
alter table public.quiz_duel_answers enable row level security;
alter table public.quiz_duel_finishes enable row level security;

-- Duelo: participantes leem; professor dono da UC lê (acompanhamento). Criar
-- exige ser membro da UC e ser o challenger. Updates (entrar/concluir) são feitos
-- pelo service role (admin client), mas liberamos update ao participante por
-- robustez.
drop policy if exists "participantes leem quiz_duel" on public.quiz_duels;
create policy "participantes leem quiz_duel" on public.quiz_duels
  for select using (
    auth.uid() in (challenger_id, opponent_id)
    or public.owns_class_unit(class_unit_id, auth.uid())
  );
drop policy if exists "criar quiz_duel como challenger" on public.quiz_duels;
create policy "criar quiz_duel como challenger" on public.quiz_duels
  for insert with check (
    auth.uid() = challenger_id and public.member_of_class_unit(class_unit_id, auth.uid())
  );
drop policy if exists "participante atualiza quiz_duel" on public.quiz_duels;
create policy "participante atualiza quiz_duel" on public.quiz_duels
  for update using (auth.uid() in (challenger_id, opponent_id))
  with check (auth.uid() in (challenger_id, opponent_id));

-- Questões do duelo: legíveis pelos participantes; sem escrita pelo usuário.
drop policy if exists "participantes leem quiz_duel_questions" on public.quiz_duel_questions;
create policy "participantes leem quiz_duel_questions" on public.quiz_duel_questions
  for select using (exists (
    select 1 from public.quiz_duels d
    where d.id = duel_id and (
      auth.uid() in (d.challenger_id, d.opponent_id)
      or public.owns_class_unit(d.class_unit_id, auth.uid())
    )
  ));

-- Respostas: o jogador gerencia as suas; participantes/dono leem (resultado).
drop policy if exists "jogador gerencia suas respostas de duelo" on public.quiz_duel_answers;
create policy "jogador gerencia suas respostas de duelo" on public.quiz_duel_answers
  for all using (player_id = auth.uid()) with check (player_id = auth.uid());
drop policy if exists "participantes leem respostas de duelo" on public.quiz_duel_answers;
create policy "participantes leem respostas de duelo" on public.quiz_duel_answers
  for select using (exists (
    select 1 from public.quiz_duels d
    where d.id = duel_id and (
      auth.uid() in (d.challenger_id, d.opponent_id)
      or public.owns_class_unit(d.class_unit_id, auth.uid())
    )
  ));

-- Finishes: jogador grava o seu; participantes/dono leem.
drop policy if exists "jogador grava seu finish" on public.quiz_duel_finishes;
create policy "jogador grava seu finish" on public.quiz_duel_finishes
  for all using (player_id = auth.uid()) with check (player_id = auth.uid());
drop policy if exists "participantes leem finishes" on public.quiz_duel_finishes;
create policy "participantes leem finishes" on public.quiz_duel_finishes
  for select using (exists (
    select 1 from public.quiz_duels d
    where d.id = duel_id and (
      auth.uid() in (d.challenger_id, d.opponent_id)
      or public.owns_class_unit(d.class_unit_id, auth.uid())
    )
  ));

-- -----------------------------------------------------------------------------
-- Verificação
-- -----------------------------------------------------------------------------
select
  (select count(*) from information_schema.tables where table_schema='public'
    and table_name in ('quiz_duels','quiz_duel_questions','quiz_duel_answers','quiz_duel_finishes')) as tabelas_quiz_duel,
  exists (select 1 from pg_type where typname='quiz_duel_status') as enum_status_ok;

-- =============================================================================
-- Sistema Jogos Programação — esquema inicial
-- =============================================================================
-- Aplica este script no SQL Editor do Supabase (em ordem, de cima para baixo).
-- Ele cria todas as tabelas, políticas de segurança (RLS) e funções base.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Perfis de usuário (estende auth.users do Supabase)
-- -----------------------------------------------------------------------------

create type public.user_role as enum ('aluno', 'professor', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'aluno',
  display_name text not null,
  avatar_url text,
  xp integer not null default 0,
  level integer not null default 1,
  created_at timestamptz not null default now()
);

-- Cria perfil automaticamente quando alguém se registra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'aluno')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2. Turmas
-- -----------------------------------------------------------------------------

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now()
);

create table public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

-- -----------------------------------------------------------------------------
-- 3. Exercícios
-- -----------------------------------------------------------------------------

create type public.difficulty as enum ('facil', 'medio', 'dificil', 'desafio');
create type public.language as enum ('csharp', 'python', 'javascript');

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete set null,
  title text not null,
  description text not null,         -- markdown
  starter_code text not null,
  solution text,                      -- referência interna pro professor
  language public.language not null default 'csharp',
  difficulty public.difficulty not null default 'facil',
  xp_reward integer not null default 10,
  is_public boolean not null default false,
  generated_by_ai boolean not null default false,
  created_at timestamptz not null default now()
);

-- Casos de teste (entrada via stdin → saída esperada via stdout)
create table public.exercise_tests (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  ord integer not null,
  stdin text not null default '',
  expected_stdout text not null,
  is_hidden boolean not null default false,  -- testes ocultos só rodam na correção final
  weight integer not null default 1
);

create index on public.exercise_tests (exercise_id, ord);

-- -----------------------------------------------------------------------------
-- 4. Listas de exercícios (atribuídas a turmas)
-- -----------------------------------------------------------------------------

create type public.assignment_kind as enum ('lista', 'desafio', 'prova');

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  kind public.assignment_kind not null default 'lista',
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.assignment_exercises (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  ord integer not null,
  primary key (assignment_id, exercise_id)
);

-- -----------------------------------------------------------------------------
-- 5. Submissões e resultados
-- -----------------------------------------------------------------------------

create type public.submission_status as enum ('rodando', 'aprovado', 'reprovado', 'erro');

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete set null,
  code text not null,
  status public.submission_status not null default 'rodando',
  passed_count integer not null default 0,
  total_count integer not null default 0,
  stdout_first text,                 -- saída do primeiro teste falho (debugging)
  stderr_first text,
  -- Antifraude
  paste_event_count integer not null default 0,
  time_to_solve_ms integer,          -- tempo entre 1ª tecla e submissão
  keystroke_count integer not null default 0,
  suspicion_score real not null default 0,  -- 0.0 a 1.0
  suspicion_reasons text[],
  created_at timestamptz not null default now()
);

create index on public.submissions (student_id, created_at desc);
create index on public.submissions (exercise_id, status);

-- -----------------------------------------------------------------------------
-- 6. Gamificação (badges)
-- -----------------------------------------------------------------------------

create table public.badges (
  id text primary key,                -- ex: 'first_green', 'streak_7'
  title text not null,
  description text not null,
  icon text                            -- url ou nome de ícone
);

create table public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- -----------------------------------------------------------------------------
-- 7. X1 (duelos PvP)
-- -----------------------------------------------------------------------------

create type public.duel_status as enum ('aguardando', 'em_andamento', 'concluido', 'cancelado');

create table public.duels (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid references public.profiles(id) on delete cascade,
  winner_id uuid references public.profiles(id) on delete set null,
  status public.duel_status not null default 'aguardando',
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 8. Row Level Security (RLS)
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_tests enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_exercises enable row level security;
alter table public.submissions enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.duels enable row level security;

-- Helper: o usuário atual é professor?
create or replace function public.is_professor(uid uuid)
returns boolean language sql stable as $$
  select exists (select 1 from public.profiles where id = uid and role in ('professor', 'admin'))
$$;

-- profiles: cada um lê o próprio + o professor lê os alunos das suas turmas
create policy "ler proprio perfil" on public.profiles
  for select using (auth.uid() = id);
create policy "professor le perfis dos alunos das suas turmas" on public.profiles
  for select using (
    public.is_professor(auth.uid()) and exists (
      select 1 from public.class_members cm
      join public.classes c on c.id = cm.class_id
      where cm.student_id = profiles.id and c.owner_id = auth.uid()
    )
  );
create policy "atualizar proprio perfil" on public.profiles
  for update using (auth.uid() = id);

-- classes: dono enxerga e modifica; aluno membro enxerga
create policy "dono gerencia classes" on public.classes
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "aluno le classes em que esta" on public.classes
  for select using (exists (
    select 1 from public.class_members
    where class_id = classes.id and student_id = auth.uid()
  ));

-- class_members: aluno se inscreve com invite code (handled na app), dono lista
create policy "aluno se inscreve" on public.class_members
  for insert with check (auth.uid() = student_id);
create policy "aluno ve sua matricula" on public.class_members
  for select using (auth.uid() = student_id);
create policy "dono ve membros" on public.class_members
  for select using (exists (
    select 1 from public.classes
    where id = class_members.class_id and owner_id = auth.uid()
  ));

-- exercises: público OU autor OU disponível em uma turma do aluno/professor
create policy "ler exercicios publicos" on public.exercises
  for select using (is_public or author_id = auth.uid());
create policy "autor gerencia exercicios" on public.exercises
  for all using (auth.uid() = author_id) with check (auth.uid() = author_id);

-- exercise_tests: visíveis se o exercício for visível; ocultos só pro autor
create policy "ler testes visiveis" on public.exercise_tests
  for select using (
    not is_hidden
    or exists (select 1 from public.exercises e where e.id = exercise_id and e.author_id = auth.uid())
  );
create policy "autor gerencia testes" on public.exercise_tests
  for all using (
    exists (select 1 from public.exercises e where e.id = exercise_id and e.author_id = auth.uid())
  );

-- assignments: dono da turma gerencia; alunos da turma leem
create policy "dono gerencia assignments" on public.assignments
  for all using (exists (
    select 1 from public.classes c where c.id = class_id and c.owner_id = auth.uid()
  ));
create policy "aluno le assignments da sua turma" on public.assignments
  for select using (exists (
    select 1 from public.class_members cm
    where cm.class_id = assignments.class_id and cm.student_id = auth.uid()
  ));

-- assignment_exercises: mesmas regras dos assignments
create policy "ler assignment_exercises" on public.assignment_exercises
  for select using (exists (
    select 1 from public.assignments a
    where a.id = assignment_id and (
      exists (select 1 from public.classes c where c.id = a.class_id and c.owner_id = auth.uid())
      or exists (select 1 from public.class_members cm where cm.class_id = a.class_id and cm.student_id = auth.uid())
    )
  ));
create policy "professor gerencia assignment_exercises" on public.assignment_exercises
  for all using (exists (
    select 1 from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = assignment_id and c.owner_id = auth.uid()
  ));

-- submissions: aluno ve as próprias; professor ve as dos alunos das suas turmas
create policy "aluno ve suas submissoes" on public.submissions
  for select using (auth.uid() = student_id);
create policy "aluno cria submissoes" on public.submissions
  for insert with check (auth.uid() = student_id);
create policy "professor ve submissoes da sua turma" on public.submissions
  for select using (
    public.is_professor(auth.uid()) and exists (
      select 1 from public.assignments a
      join public.classes c on c.id = a.class_id
      where a.id = submissions.assignment_id and c.owner_id = auth.uid()
    )
  );

-- badges: catálogo público
create policy "todos leem catalogo de badges" on public.badges for select using (true);
create policy "aluno ve suas badges" on public.user_badges
  for select using (auth.uid() = user_id);

-- duels: participantes leem; qualquer um cria; sistema atualiza
create policy "participantes leem duelo" on public.duels
  for select using (auth.uid() in (challenger_id, opponent_id));
create policy "criar duelo como challenger" on public.duels
  for insert with check (auth.uid() = challenger_id);
create policy "atualizar duelo como participante" on public.duels
  for update using (auth.uid() in (challenger_id, opponent_id));

-- -----------------------------------------------------------------------------
-- 9. Seed inicial: badges padrão
-- -----------------------------------------------------------------------------

insert into public.badges (id, title, description) values
  ('first_green', 'Primeira Vitória', 'Sua primeira submissão aprovada'),
  ('streak_7',    'Semana Consistente', 'Resolveu pelo menos um exercício por 7 dias seguidos'),
  ('no_paste',    'Mão Própria', 'Resolveu 10 exercícios sem nenhum paste'),
  ('duel_win_5',  'Duelista', 'Venceu 5 duelos X1'),
  ('ai_curious',  'Curioso', 'Gerou seu primeiro exercício com IA')
on conflict (id) do nothing;

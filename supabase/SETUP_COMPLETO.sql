-- =============================================================================
-- SETUP COMPLETO — Reset + Schema + Seed base (CodeQuest)
-- =============================================================================
-- Rode este arquivo INTEIRO no SQL Editor do Supabase para zerar e recriar todo
-- o banco do zero, já com TODAS as fases:
--   - Auth/perfis, turmas, exercícios, listas, submissões
--   - Gamificação (XP, nível, badges) + antifraude
--   - Cache de IA + duelos/ELO + GitHub Classroom
--   - Linguagens DINÂMICAS (tabela `languages`)
--   - Correção MANUAL do professor (nota + feedback, estilo SpeedGrader)
--
-- ATENÇÃO: a primeira seção APAGA os dados das tabelas do app (DROP). Os USUÁRIOS
-- de login (auth.users) NÃO são apagados aqui — para recriar os usuários demo,
-- rode depois:   cd web && npm run seed:demo:reset
--
-- Idempotente o suficiente para rodar mais de uma vez.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. RESET — derruba tabelas e tipos do app (na ordem certa de dependência)
-- -----------------------------------------------------------------------------
drop table if exists public.attendance_marks cascade;
drop table if exists public.attendance_sessions cascade;
drop table if exists public.class_units cascade;
drop table if exists public.teaching_plan_blocks cascade;
drop table if exists public.teaching_plans cascade;
drop table if exists public.uc_bibliography cascade;
drop table if exists public.uc_knowledge cascade;
drop table if exists public.uc_capabilities cascade;
drop table if exists public.curricular_units cascade;
drop table if exists public.course_modules cascade;
drop table if exists public.courses cascade;
drop table if exists public.github_classroom_repos cascade;
drop table if exists public.ai_generation_cache cascade;
drop table if exists public.duels cascade;
drop table if exists public.user_badges cascade;
drop table if exists public.badges cascade;
drop table if exists public.submissions cascade;
drop table if exists public.assignment_exercises cascade;
drop table if exists public.assignments cascade;
drop table if exists public.exercise_tests cascade;
drop table if exists public.exercises cascade;
drop table if exists public.languages cascade;
drop table if exists public.class_members cascade;
drop table if exists public.classes cascade;
drop table if exists public.profiles cascade;

drop type if exists public.attendance_status cascade;
drop type if exists public.bibliography_kind cascade;
drop type if exists public.capability_kind cascade;
drop type if exists public.duel_status cascade;
drop type if exists public.submission_status cascade;
drop type if exists public.assignment_kind cascade;
drop type if exists public.language cascade;
drop type if exists public.difficulty cascade;
drop type if exists public.user_role cascade;

-- =============================================================================
-- 1. PERFIS
-- =============================================================================
create type public.user_role as enum ('aluno', 'professor', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'aluno',
  display_name text not null,
  avatar_url text,
  xp integer not null default 0,
  level integer not null default 1,
  -- duelos
  duel_rating integer not null default 1000,
  duel_wins integer not null default 0,
  duel_losses integer not null default 0,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 2. TURMAS
-- =============================================================================
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

-- =============================================================================
-- 3. LINGUAGENS (catálogo dinâmico)
-- =============================================================================
create table public.languages (
  id text primary key,
  label text not null,
  piston_runtime text,
  piston_version text not null default '*',
  source_file text not null,
  monaco_language text not null,
  starter_code text not null default '',
  runner text not null default 'piston',   -- 'piston' | 'simulator' | 'none'
  is_enabled boolean not null default true,
  ord integer not null default 100,
  created_at timestamptz not null default now()
);

insert into public.languages
  (id, label, piston_runtime, piston_version, source_file, monaco_language, runner, is_enabled, ord, starter_code)
values
  ('csharp', 'C#', 'csharp.net', '*', 'main.cs', 'csharp', 'piston', true, 10,
   E'using System;\n\nclass Program\n{\n    static void Main()\n    {\n        // seu código aqui\n    }\n}\n'),
  ('python', 'Python', 'python', '*', 'main.py', 'python', 'piston', true, 20,
   E'# seu código aqui\n'),
  ('javascript', 'JavaScript', 'javascript', '*', 'main.js', 'javascript', 'piston', true, 30,
   E'// seu código aqui\n'),
  ('cpp', 'C++', 'c++', '*', 'main.cpp', 'cpp', 'piston', true, 40,
   E'#include <iostream>\nusing namespace std;\n\nint main() {\n    // seu código aqui\n    return 0;\n}\n'),
  ('java', 'Java', 'java', '*', 'Main.java', 'java', 'piston', true, 50,
   E'public class Main {\n    public static void main(String[] args) {\n        // seu código aqui\n    }\n}\n'),
  ('typescript', 'TypeScript', 'typescript', '*', 'main.ts', 'typescript', 'piston', true, 60,
   E'// seu código aqui\n'),
  -- Arduino: PLANEJADO, desabilitado (ver docs/ARDUINO_PLANO.md)
  ('arduino', 'Arduino (C++)', null, '*', 'sketch.ino', 'cpp', 'simulator', false, 200,
   E'// Sketch Arduino — simulador em desenvolvimento\nvoid setup() {\n}\n\nvoid loop() {\n}\n');

alter table public.languages enable row level security;
create policy "todos leem linguagens" on public.languages for select using (true);

-- =============================================================================
-- 4. EXERCÍCIOS
-- =============================================================================
create type public.difficulty as enum ('facil', 'medio', 'dificil', 'desafio');
-- Mantido por compatibilidade; a fonte da verdade nova é languages.id (language_id).
create type public.language as enum ('csharp', 'python', 'javascript');

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text not null,
  starter_code text not null,
  solution text,
  language public.language not null default 'csharp',
  language_id text references public.languages(id),
  difficulty public.difficulty not null default 'facil',
  xp_reward integer not null default 10,
  is_public boolean not null default false,
  generated_by_ai boolean not null default false,
  created_at timestamptz not null default now()
);
create index exercises_language_id_idx on public.exercises (language_id);

create table public.exercise_tests (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  ord integer not null,
  stdin text not null default '',
  expected_stdout text not null,
  is_hidden boolean not null default false,
  weight integer not null default 1
);
create index on public.exercise_tests (exercise_id, ord);

-- =============================================================================
-- 5. LISTAS (assignments)
-- =============================================================================
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

-- =============================================================================
-- 6. SUBMISSÕES (+ antifraude + correção manual)
-- =============================================================================
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
  stdout_first text,
  stderr_first text,
  -- antifraude
  paste_event_count integer not null default 0,
  time_to_solve_ms integer,
  keystroke_count integer not null default 0,
  suspicion_score real not null default 0,
  suspicion_reasons text[],
  -- gamificação processada pelo trigger
  xp_awarded integer not null default 0,
  badges_awarded text[] not null default '{}',
  xp_processed_at timestamptz,
  -- correção manual do professor (SpeedGrader)
  manual_grade numeric(4,2),
  manual_feedback text,
  graded_by uuid references public.profiles(id) on delete set null,
  graded_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.submissions (student_id, created_at desc);
create index on public.submissions (exercise_id, status);
create index submissions_student_exercise_approved_idx
  on public.submissions (student_id, exercise_id) where status = 'aprovado';
create index submissions_assignment_created_at_idx
  on public.submissions (assignment_id, created_at desc);

-- =============================================================================
-- 7. GAMIFICAÇÃO (badges + trigger de recompensa)
-- =============================================================================
create table public.badges (
  id text primary key,
  title text not null,
  description text not null,
  icon text
);

create table public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create or replace function public.difficulty_multiplier(diff public.difficulty)
returns numeric language sql immutable as $$
  select case diff
    when 'facil' then 1.0 when 'medio' then 1.5
    when 'dificil' then 2.0 when 'desafio' then 3.0 else 1.0 end
$$;

create or replace function public.award_badge(target_user uuid, target_badge text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_badges (user_id, badge_id)
  values (target_user, target_badge)
  on conflict (user_id, badge_id) do nothing;
  return found;
end;
$$;

create or replace function public.handle_approved_submission_rewards()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_xp integer; diff public.difficulty; earned_xp integer := 0;
  approved_before integer := 0; clean_approved_count integer := 0;
  has_seven_day_streak boolean := false;
begin
  new.xp_awarded := 0; new.badges_awarded := '{}'; new.xp_processed_at := null;
  if new.status <> 'aprovado' then return new; end if;

  select e.xp_reward, e.difficulty into base_xp, diff
  from public.exercises e where e.id = new.exercise_id;
  if base_xp is null then return new; end if;

  select count(*) into approved_before from public.submissions s
  where s.student_id = new.student_id and s.status = 'aprovado';

  if not exists (
    select 1 from public.submissions s
    where s.student_id = new.student_id and s.exercise_id = new.exercise_id
      and s.status = 'aprovado'
  ) then
    earned_xp := greatest(0, round(base_xp * public.difficulty_multiplier(diff))::integer);
    new.xp_awarded := earned_xp; new.xp_processed_at := now();
    update public.profiles p
    set xp = p.xp + earned_xp, level = floor((p.xp + earned_xp) / 100.0)::integer + 1
    where p.id = new.student_id;
  end if;

  if approved_before = 0 then
    if public.award_badge(new.student_id, 'first_green') then
      new.badges_awarded := array_append(new.badges_awarded, 'first_green');
    end if;
  end if;

  select count(distinct s.exercise_id) into clean_approved_count
  from public.submissions s
  where s.student_id = new.student_id and s.status = 'aprovado' and s.paste_event_count = 0;

  if coalesce(new.paste_event_count, 0) = 0 and not exists (
    select 1 from public.submissions s
    where s.student_id = new.student_id and s.exercise_id = new.exercise_id
      and s.status = 'aprovado' and s.paste_event_count = 0
  ) then
    clean_approved_count := clean_approved_count + 1;
  end if;

  if clean_approved_count >= 10 then
    if public.award_badge(new.student_id, 'no_paste') then
      new.badges_awarded := array_append(new.badges_awarded, 'no_paste');
    end if;
  end if;

  with solved_days as (
    select distinct s.created_at::date as solved_on from public.submissions s
    where s.student_id = new.student_id and s.status = 'aprovado'
    union select new.created_at::date
  ), required_days as (
    select generate_series(new.created_at::date - interval '6 days',
      new.created_at::date, interval '1 day')::date as solved_on
  )
  select not exists (
    select 1 from required_days rd
    left join solved_days sd on sd.solved_on = rd.solved_on
    where sd.solved_on is null
  ) into has_seven_day_streak;

  if has_seven_day_streak then
    if public.award_badge(new.student_id, 'streak_7') then
      new.badges_awarded := array_append(new.badges_awarded, 'streak_7');
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_submission_approved_rewards on public.submissions;
create trigger on_submission_approved_rewards
  before insert on public.submissions
  for each row execute function public.handle_approved_submission_rewards();

insert into public.badges (id, title, description) values
  ('first_green', 'Primeira Vitoria', 'Sua primeira submissao aprovada'),
  ('streak_7', 'Semana Consistente', 'Resolveu pelo menos um exercicio por 7 dias seguidos'),
  ('no_paste', 'Mao Propria', 'Resolveu 10 exercicios sem nenhum paste'),
  ('duel_win_5', 'Duelista', 'Venceu 5 duelos X1'),
  ('ai_curious', 'Curioso', 'Gerou seu primeiro exercicio com IA')
on conflict (id) do nothing;

-- =============================================================================
-- 8. DUELOS X1
-- =============================================================================
create type public.duel_status as enum ('aguardando', 'em_andamento', 'concluido', 'cancelado');

create table public.duels (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid references public.profiles(id) on delete cascade,
  winner_id uuid references public.profiles(id) on delete set null,
  status public.duel_status not null default 'aguardando',
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  challenger_rating_before integer, challenger_rating_after integer,
  opponent_rating_before integer, opponent_rating_after integer,
  rating_delta integer,
  started_at timestamptz, ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index profiles_duel_rating_idx on public.profiles (duel_rating desc);

-- =============================================================================
-- 9. CACHE DE IA + GITHUB CLASSROOM
-- =============================================================================
create table public.ai_generation_cache (
  cache_key text primary key,
  kind text not null,
  prompt text not null,
  difficulty public.difficulty not null,
  payload jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.ai_generation_cache enable row level security;

create table public.github_classroom_repos (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  repo_full_name text not null,
  student_name text, assignment_title text,
  latest_status text, latest_score numeric,
  latest_commit_sha text, latest_run_url text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, repo_full_name)
);
alter table public.github_classroom_repos enable row level security;

-- =============================================================================
-- 10. RLS — políticas
-- =============================================================================
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

create or replace function public.is_professor(uid uuid)
returns boolean language sql stable as $$
  select exists (select 1 from public.profiles where id = uid and role in ('professor', 'admin'))
$$;

-- Helpers SECURITY DEFINER para quebrar a recursão entre `classes` e
-- `class_members` (cada policy consultava a outra tabela, disparando o
-- avaliador de RLS dela em loop). Rodando como definer, leem as tabelas SEM
-- reavaliar RLS, então não há ciclo.
create or replace function public.is_class_owner(target_class uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classes c where c.id = target_class and c.owner_id = uid)
$$;

create or replace function public.is_class_member(target_class uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.class_members m
    where m.class_id = target_class and m.student_id = uid)
$$;

-- profiles
create policy "ler proprio perfil" on public.profiles for select using (auth.uid() = id);
create policy "professor le perfis dos alunos das suas turmas" on public.profiles for select using (
  public.is_professor(auth.uid()) and exists (
    select 1 from public.class_members cm
    where cm.student_id = profiles.id and public.is_class_owner(cm.class_id, auth.uid())));
create policy "atualizar proprio perfil" on public.profiles for update using (auth.uid() = id);

-- classes
create policy "dono gerencia classes" on public.classes for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "aluno le classes em que esta" on public.classes for select using (
  public.is_class_member(classes.id, auth.uid()));

-- class_members
create policy "aluno se inscreve" on public.class_members for insert with check (auth.uid() = student_id);
create policy "aluno ve sua matricula" on public.class_members for select using (auth.uid() = student_id);
create policy "dono ve membros" on public.class_members for select using (
  public.is_class_owner(class_members.class_id, auth.uid()));

-- exercises
create policy "ler exercicios publicos" on public.exercises for select using (is_public or author_id = auth.uid());
create policy "autor gerencia exercicios" on public.exercises for all using (auth.uid() = author_id) with check (auth.uid() = author_id);

-- exercise_tests
create policy "ler testes visiveis" on public.exercise_tests for select using (
  not is_hidden or exists (select 1 from public.exercises e where e.id = exercise_id and e.author_id = auth.uid()));
create policy "autor gerencia testes" on public.exercise_tests for all using (
  exists (select 1 from public.exercises e where e.id = exercise_id and e.author_id = auth.uid()));

-- assignments
create policy "dono gerencia assignments" on public.assignments for all using (exists (
  select 1 from public.classes c where c.id = class_id and c.owner_id = auth.uid()));
create policy "aluno le assignments da sua turma" on public.assignments for select using (exists (
  select 1 from public.class_members cm where cm.class_id = assignments.class_id and cm.student_id = auth.uid()));

-- assignment_exercises
create policy "ler assignment_exercises" on public.assignment_exercises for select using (exists (
  select 1 from public.assignments a where a.id = assignment_id and (
    exists (select 1 from public.classes c where c.id = a.class_id and c.owner_id = auth.uid())
    or exists (select 1 from public.class_members cm where cm.class_id = a.class_id and cm.student_id = auth.uid()))));
create policy "professor gerencia assignment_exercises" on public.assignment_exercises for all using (exists (
  select 1 from public.assignments a join public.classes c on c.id = a.class_id
  where a.id = assignment_id and c.owner_id = auth.uid()));

-- submissions
create policy "aluno ve suas submissoes" on public.submissions for select using (auth.uid() = student_id);
create policy "aluno cria submissoes" on public.submissions for insert with check (auth.uid() = student_id);
create policy "professor ve submissoes da sua turma" on public.submissions for select using (
  public.is_professor(auth.uid()) and exists (
    select 1 from public.assignments a join public.classes c on c.id = a.class_id
    where a.id = submissions.assignment_id and c.owner_id = auth.uid()));
create policy "professor corrige submissoes da sua turma" on public.submissions for update using (
  public.is_professor(auth.uid()) and exists (
    select 1 from public.assignments a join public.classes c on c.id = a.class_id
    where a.id = submissions.assignment_id and c.owner_id = auth.uid()))
  with check (
  public.is_professor(auth.uid()) and exists (
    select 1 from public.assignments a join public.classes c on c.id = a.class_id
    where a.id = submissions.assignment_id and c.owner_id = auth.uid()));

-- badges
create policy "todos leem catalogo de badges" on public.badges for select using (true);
create policy "aluno ve suas badges" on public.user_badges for select using (auth.uid() = user_id);

-- duels
create policy "participantes leem duelo" on public.duels for select using (auth.uid() in (challenger_id, opponent_id));
create policy "criar duelo como challenger" on public.duels for insert with check (auth.uid() = challenger_id);
create policy "atualizar duelo como participante" on public.duels for update using (auth.uid() in (challenger_id, opponent_id));

-- ai cache
create policy "professor le cache ia proprio" on public.ai_generation_cache for select using (
  created_by = auth.uid() or public.is_professor(auth.uid()));

-- github classroom
create policy "professor gerencia repos github classroom" on public.github_classroom_repos for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- =============================================================================
-- 11. CAMADA CURRICULAR (PPC → Plano de Ensino → Turma) — Fase 8
-- =============================================================================
-- CURSO (compartilhado) → MÓDULO → UC (habilidades, conhecimentos, bibliografia)
-- PLANO DE ENSINO (do professor, clonável) → BLOCO/AULA
-- TURMA: vínculo turma↔UC↔plano + FREQUÊNCIA (grade aluno × aula).

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  name text not null,
  description text,
  eixo text,
  carga_horaria_total integer,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,
  ord integer not null default 0
);
create index course_modules_course_idx on public.course_modules (course_id, ord);

create table public.curricular_units (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  carga_horaria_h integer,
  objetivo_geral text,
  ord integer not null default 0
);
create index curricular_units_module_idx on public.curricular_units (module_id, ord);

create type public.capability_kind as enum ('tecnica', 'socioemocional', 'basica');

create table public.uc_capabilities (
  id uuid primary key default gen_random_uuid(),
  uc_id uuid not null references public.curricular_units(id) on delete cascade,
  code text,
  description text not null,
  kind public.capability_kind not null default 'tecnica',
  ord integer not null default 0
);
create index uc_capabilities_uc_idx on public.uc_capabilities (uc_id, ord);

create table public.uc_knowledge (
  id uuid primary key default gen_random_uuid(),
  uc_id uuid not null references public.curricular_units(id) on delete cascade,
  parent_id uuid references public.uc_knowledge(id) on delete cascade,
  text text not null,
  ord integer not null default 0
);
create index uc_knowledge_uc_idx on public.uc_knowledge (uc_id, ord);

create type public.bibliography_kind as enum ('basica', 'complementar');

create table public.uc_bibliography (
  id uuid primary key default gen_random_uuid(),
  uc_id uuid not null references public.curricular_units(id) on delete cascade,
  reference text not null,
  tipo public.bibliography_kind not null default 'basica',
  ord integer not null default 0
);
create index uc_bibliography_uc_idx on public.uc_bibliography (uc_id, ord);

create table public.teaching_plans (
  id uuid primary key default gen_random_uuid(),
  uc_id uuid not null references public.curricular_units(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  cloned_from uuid references public.teaching_plans(id) on delete set null,
  created_at timestamptz not null default now()
);
create index teaching_plans_uc_idx on public.teaching_plans (uc_id);
create index teaching_plans_owner_idx on public.teaching_plans (owner_id);

create table public.teaching_plan_blocks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.teaching_plans(id) on delete cascade,
  title text not null,
  aula_inicio integer,
  aula_fim integer,
  conteudo text,
  apresentacao_url text,
  atividade text,
  criterios text,
  ord integer not null default 0
);
create index teaching_plan_blocks_plan_idx on public.teaching_plan_blocks (plan_id, ord);

create table public.class_units (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  uc_id uuid not null references public.curricular_units(id) on delete cascade,
  teaching_plan_id uuid references public.teaching_plans(id) on delete set null,
  serie text,
  created_at timestamptz not null default now(),
  unique (class_id, uc_id)
);
create index class_units_class_idx on public.class_units (class_id);

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  class_unit_id uuid not null references public.class_units(id) on delete cascade,
  session_number integer not null,
  date date,
  label text,
  unique (class_unit_id, session_number)
);
create index attendance_sessions_cu_idx on public.attendance_sessions (class_unit_id, session_number);

create type public.attendance_status as enum ('presente', 'falta', 'atraso');

create table public.attendance_marks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status public.attendance_status not null default 'presente',
  unique (session_id, student_id)
);
create index attendance_marks_session_idx on public.attendance_marks (session_id);

-- RLS
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.curricular_units enable row level security;
alter table public.uc_capabilities enable row level security;
alter table public.uc_knowledge enable row level security;
alter table public.uc_bibliography enable row level security;
alter table public.teaching_plans enable row level security;
alter table public.teaching_plan_blocks enable row level security;
alter table public.class_units enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_marks enable row level security;

create or replace function public.owns_course(course uuid)
returns boolean language sql stable as $$
  select exists (select 1 from public.courses c where c.id = course and c.author_id = auth.uid())
$$;

create policy "professor le cursos" on public.courses
  for select using (is_public or author_id = auth.uid() or public.is_professor(auth.uid()));
create policy "autor gerencia curso" on public.courses
  for all using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "professor le modulos" on public.course_modules
  for select using (public.is_professor(auth.uid()));
create policy "autor gerencia modulos" on public.course_modules
  for all using (public.owns_course(course_id)) with check (public.owns_course(course_id));

create policy "professor le ucs" on public.curricular_units
  for select using (public.is_professor(auth.uid()));
create policy "autor gerencia ucs" on public.curricular_units
  for all using (exists (
    select 1 from public.course_modules m where m.id = module_id and public.owns_course(m.course_id)
  )) with check (exists (
    select 1 from public.course_modules m where m.id = module_id and public.owns_course(m.course_id)
  ));

do $$
declare t text;
begin
  foreach t in array array['uc_capabilities','uc_knowledge','uc_bibliography'] loop
    execute format(
      'create policy "professor le %1$s" on public.%1$I for select using (public.is_professor(auth.uid()))', t);
    execute format($f$
      create policy "autor gerencia %1$s" on public.%1$I for all
        using (exists (
          select 1 from public.curricular_units u
          join public.course_modules m on m.id = u.module_id
          where u.id = uc_id and public.owns_course(m.course_id)))
        with check (exists (
          select 1 from public.curricular_units u
          join public.course_modules m on m.id = u.module_id
          where u.id = uc_id and public.owns_course(m.course_id)))
    $f$, t);
  end loop;
end $$;

create policy "professor le planos" on public.teaching_plans
  for select using (public.is_professor(auth.uid()));
create policy "dono gerencia planos" on public.teaching_plans
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "professor le blocos" on public.teaching_plan_blocks
  for select using (public.is_professor(auth.uid()));
create policy "dono gerencia blocos" on public.teaching_plan_blocks
  for all using (exists (
    select 1 from public.teaching_plans p where p.id = plan_id and p.owner_id = auth.uid()
  )) with check (exists (
    select 1 from public.teaching_plans p where p.id = plan_id and p.owner_id = auth.uid()
  ));

create policy "dono gerencia class_units" on public.class_units
  for all using (exists (
    select 1 from public.classes c where c.id = class_id and c.owner_id = auth.uid()
  )) with check (exists (
    select 1 from public.classes c where c.id = class_id and c.owner_id = auth.uid()
  ));
create policy "aluno le class_units da sua turma" on public.class_units
  for select using (exists (
    select 1 from public.class_members cm where cm.class_id = class_units.class_id and cm.student_id = auth.uid()
  ));

create policy "dono gerencia attendance_sessions" on public.attendance_sessions
  for all using (exists (
    select 1 from public.class_units cu join public.classes c on c.id = cu.class_id
    where cu.id = class_unit_id and c.owner_id = auth.uid()
  )) with check (exists (
    select 1 from public.class_units cu join public.classes c on c.id = cu.class_id
    where cu.id = class_unit_id and c.owner_id = auth.uid()
  ));

create policy "dono gerencia attendance_marks" on public.attendance_marks
  for all using (exists (
    select 1 from public.attendance_sessions s
    join public.class_units cu on cu.id = s.class_unit_id
    join public.classes c on c.id = cu.class_id
    where s.id = session_id and c.owner_id = auth.uid()
  )) with check (exists (
    select 1 from public.attendance_sessions s
    join public.class_units cu on cu.id = s.class_unit_id
    join public.classes c on c.id = cu.class_id
    where s.id = session_id and c.owner_id = auth.uid()
  ));
create policy "aluno ve sua presenca" on public.attendance_marks
  for select using (student_id = auth.uid());

-- =============================================================================
-- 12. Verificação final
-- =============================================================================
select
  (select count(*) from public.languages where is_enabled) as linguagens_ativas,
  (select count(*) from public.badges) as badges,
  exists (select 1 from information_schema.columns
    where table_name = 'submissions' and column_name = 'manual_grade') as correcao_manual_ok,
  exists (select 1 from information_schema.columns
    where table_name = 'exercises' and column_name = 'language_id') as language_id_ok,
  (select count(*) from information_schema.tables
    where table_schema = 'public'
      and table_name in ('courses','course_modules','curricular_units','uc_capabilities',
        'uc_knowledge','uc_bibliography','teaching_plans','teaching_plan_blocks',
        'class_units','attendance_sessions','attendance_marks')) as tabelas_curriculo;

-- =============================================================================
-- PRONTO. Agora rode no terminal para criar usuários + dados demo:
--   cd web
--   npm run seed:demo:reset
-- =============================================================================

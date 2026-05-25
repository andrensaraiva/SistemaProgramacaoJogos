-- =============================================================================
-- Query reparadora idempotente - Gamificacao + Antifraude
-- =============================================================================
-- Use no SQL Editor do Supabase quando o banco ja tem a migration 0001_init.sql
-- aplicada. Pode rodar mais de uma vez.
--
-- Ela NAO recria tipos/tabelas base como user_role, profiles, submissions etc.
-- Ela apenas garante as colunas, funcoes e trigger da Fase 4/5.
-- =============================================================================

alter table public.submissions
  add column if not exists xp_awarded integer not null default 0,
  add column if not exists badges_awarded text[] not null default '{}',
  add column if not exists xp_processed_at timestamptz;

alter table public.submissions
  add column if not exists paste_event_count integer not null default 0,
  add column if not exists time_to_solve_ms integer,
  add column if not exists keystroke_count integer not null default 0,
  add column if not exists suspicion_score real not null default 0,
  add column if not exists suspicion_reasons text[];

create index if not exists submissions_student_exercise_approved_idx
  on public.submissions (student_id, exercise_id)
  where status = 'aprovado';

create index if not exists submissions_assignment_created_at_idx
  on public.submissions (assignment_id, created_at desc);

create or replace function public.difficulty_multiplier(diff public.difficulty)
returns numeric
language sql
immutable
as $$
  select case diff
    when 'facil' then 1.0
    when 'medio' then 1.5
    when 'dificil' then 2.0
    when 'desafio' then 3.0
    else 1.0
  end
$$;

create or replace function public.award_badge(target_user uuid, target_badge text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_badges (user_id, badge_id)
  values (target_user, target_badge)
  on conflict (user_id, badge_id) do nothing;

  return found;
end;
$$;

create or replace function public.handle_approved_submission_rewards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_xp integer;
  diff public.difficulty;
  earned_xp integer := 0;
  approved_before integer := 0;
  clean_approved_count integer := 0;
  has_seven_day_streak boolean := false;
begin
  new.xp_awarded := 0;
  new.badges_awarded := '{}';
  new.xp_processed_at := null;

  if new.status <> 'aprovado' then
    return new;
  end if;

  select e.xp_reward, e.difficulty
    into base_xp, diff
  from public.exercises e
  where e.id = new.exercise_id;

  if base_xp is null then
    return new;
  end if;

  select count(*)
    into approved_before
  from public.submissions s
  where s.student_id = new.student_id
    and s.status = 'aprovado';

  if not exists (
    select 1
    from public.submissions s
    where s.student_id = new.student_id
      and s.exercise_id = new.exercise_id
      and s.status = 'aprovado'
  ) then
    earned_xp := greatest(0, round(base_xp * public.difficulty_multiplier(diff))::integer);
    new.xp_awarded := earned_xp;
    new.xp_processed_at := now();

    update public.profiles p
    set
      xp = p.xp + earned_xp,
      level = floor((p.xp + earned_xp) / 100.0)::integer + 1
    where p.id = new.student_id;
  end if;

  if approved_before = 0 then
    if public.award_badge(new.student_id, 'first_green') then
      new.badges_awarded := array_append(new.badges_awarded, 'first_green');
    end if;
  end if;

  select count(distinct s.exercise_id)
    into clean_approved_count
  from public.submissions s
  where s.student_id = new.student_id
    and s.status = 'aprovado'
    and s.paste_event_count = 0;

  if coalesce(new.paste_event_count, 0) = 0
    and not exists (
      select 1
      from public.submissions s
      where s.student_id = new.student_id
        and s.exercise_id = new.exercise_id
        and s.status = 'aprovado'
        and s.paste_event_count = 0
    ) then
    clean_approved_count := clean_approved_count + 1;
  end if;

  if clean_approved_count >= 10 then
    if public.award_badge(new.student_id, 'no_paste') then
      new.badges_awarded := array_append(new.badges_awarded, 'no_paste');
    end if;
  end if;

  with solved_days as (
    select distinct s.created_at::date as solved_on
    from public.submissions s
    where s.student_id = new.student_id
      and s.status = 'aprovado'
    union
    select new.created_at::date
  ),
  required_days as (
    select generate_series(
      new.created_at::date - interval '6 days',
      new.created_at::date,
      interval '1 day'
    )::date as solved_on
  )
  select not exists (
    select 1
    from required_days rd
    left join solved_days sd on sd.solved_on = rd.solved_on
    where sd.solved_on is null
  )
    into has_seven_day_streak;

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
  for each row
  execute function public.handle_approved_submission_rewards();

insert into public.badges (id, title, description) values
  ('first_green', 'Primeira Vitoria', 'Sua primeira submissao aprovada'),
  ('streak_7', 'Semana Consistente', 'Resolveu pelo menos um exercicio por 7 dias seguidos'),
  ('no_paste', 'Mao Propria', 'Resolveu 10 exercicios sem nenhum paste')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description;

-- Verificacao final: deve retornar uma linha com todas as colunas/funcoes ok.
select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'submissions'
      and column_name = 'xp_awarded'
  ) as xp_awarded_ok,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'submissions'
      and column_name = 'badges_awarded'
  ) as badges_awarded_ok,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'submissions'
      and column_name = 'suspicion_score'
  ) as suspicion_score_ok,
  exists (
    select 1 from pg_trigger
    where tgname = 'on_submission_approved_rewards'
  ) as rewards_trigger_ok;

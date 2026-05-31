-- =============================================================================
-- Tipos de exercício — código, apresentação (link) e modelo de resposta
-- =============================================================================
-- Até aqui todo exercício era de código (Piston + testes), e submissions.code era
-- NOT NULL. Agora suportamos entregas que NÃO são código:
--   - 'apresentacao': aluno entrega um LINK (Drive/OneDrive) + comentário
--   - 'modelo_resposta': professor define um enunciado/modelo; aluno preenche texto
-- Ambos são corrigidos manualmente (nota/feedback já existentes em submissions).
-- Também preparamos entrega em GRUPO (group_id; a tabela de grupos vem na fase C).
--
-- Idempotente. Aplicar com: npx supabase db push
-- =============================================================================

-- 1. Tipo de exercício
do $$ begin
  create type public.exercise_type as enum ('codigo', 'apresentacao', 'modelo_resposta');
exception when duplicate_object then null; end $$;

alter table public.exercises
  add column if not exists exercise_type public.exercise_type not null default 'codigo',
  add column if not exists is_group boolean not null default false,
  add column if not exists response_template text;  -- enunciado/modelo p/ 'modelo_resposta'

-- 2. submissions aceita entregas não-código
alter table public.submissions
  alter column code drop not null;

alter table public.submissions
  add column if not exists submission_link text,   -- link externo (apresentacao)
  add column if not exists response_text text,      -- resposta preenchida (modelo_resposta)
  add column if not exists group_id uuid;           -- entrega de grupo (FK na fase C)

-- 3. novo status 'entregue' (entrega aguardando correção manual)
do $$ begin
  alter type public.submission_status add value if not exists 'entregue';
exception when others then null; end $$;

-- 4. Gamificação: guarda para não-código. O XP automático por testes só vale
-- para exercícios de código; entregas (apresentação/modelo) ganham nota manual.
create or replace function public.handle_approved_submission_rewards()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_xp integer; diff public.difficulty; earned_xp integer := 0;
  approved_before integer := 0; clean_approved_count integer := 0;
  has_seven_day_streak boolean := false;
  etype public.exercise_type;
begin
  new.xp_awarded := 0; new.badges_awarded := '{}'; new.xp_processed_at := null;
  if new.status <> 'aprovado' then return new; end if;

  select e.xp_reward, e.difficulty, e.exercise_type into base_xp, diff, etype
  from public.exercises e where e.id = new.exercise_id;
  if base_xp is null then return new; end if;
  -- Só código gera XP/badges automáticos.
  if etype is distinct from 'codigo' then return new; end if;

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

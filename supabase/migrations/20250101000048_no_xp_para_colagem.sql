-- =============================================================================
-- Segurança da recompensa: submissão com COLAGEM não ganha XP
-- =============================================================================
-- O antifraude já detecta e registra colagem (paste_event_count > 0 e
-- suspicion_score). Mas a versão anterior do trigger dava XP CHEIO mesmo em
-- código colado — o sinal era guardado e ignorado na recompensa. Isso permitia
-- farmar XP colando soluções.
--
-- Aqui redefinimos o trigger: se houve colagem (paste_event_count > 0), a
-- aprovação é registrada normalmente (conta como resolvida, aparece pro
-- professor com o alerta), mas NÃO concede XP. O aluno continua vendo o
-- resultado; só não é recompensado por código que não digitou.
--
-- Badges: `first_green` (participação) segue liberando; `no_paste` e `streak_7`
-- já tratavam colagem corretamente. Idempotente. Aplicar: npx supabase db push
-- =============================================================================

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

  -- XP só na PRIMEIRA aprovação do exercício E se NÃO houve colagem.
  -- Código colado é registrado como resolvido, mas não recompensado.
  if coalesce(new.paste_event_count, 0) = 0
    and not exists (
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

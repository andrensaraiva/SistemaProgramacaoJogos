-- ###################### 20250101000046_exercises_visiveis_na_turma.sql ######################
-- =============================================================================
-- Exercício visível para quem está na turma onde ele foi atribuído
-- =============================================================================
-- A policy original ("ler exercicios publicos", migration 0001) só libera SELECT
-- quando `is_public` OU `author_id = auth.uid()`. O comentário daquela migration
-- prometia também "disponível em uma turma do aluno/professor", mas essa cláusula
-- nunca existiu. Resultado: um exercício NÃO público anexado a uma lista é lido
-- pelo aluno no vínculo (assignment_exercises), mas o embed do próprio exercício
-- volta null por RLS — quebrando/zerando a tela da lista.
--
-- Aqui adicionamos uma policy PERMISSIVA extra (as policies de SELECT são OR):
-- pode ler o exercício quem é dono OU membro de alguma turma em que ele está
-- atribuído. Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

drop policy if exists "ler exercicios da minha turma" on public.exercises;
create policy "ler exercicios da minha turma" on public.exercises
  for select using (
    exists (
      select 1
      from public.assignment_exercises ae
      join public.assignments a on a.id = ae.assignment_id
      where ae.exercise_id = exercises.id
        and (
          exists (
            select 1 from public.classes c
            where c.id = a.class_id and c.owner_id = auth.uid()
          )
          or exists (
            select 1 from public.class_members cm
            where cm.class_id = a.class_id and cm.student_id = auth.uid()
          )
        )
    )
  );

-- ###################### 20250101000047_project_grades.sql ######################
-- =============================================================================
-- Nota/avaliação do PROJETO INTEGRADOR por grupo
-- =============================================================================
-- Cada grupo entrega o seu projeto (board próprio). O professor dono da UC dá
-- uma NOTA (0–10) + FEEDBACK ao projeto de cada grupo. Uma linha por
-- (project, group). Os membros do grupo leem a própria nota; o professor
-- gerencia. Reusa helpers SECURITY DEFINER owns_class_unit / is_group_member.
--
-- Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

create table if not exists public.project_grades (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  group_id uuid not null references public.class_groups(id) on delete cascade,
  grade numeric(4, 1),                     -- 0.0–10.0; null = sem nota ainda
  feedback text,
  graded_by uuid references public.profiles(id) on delete set null,
  graded_at timestamptz,
  unique (project_id, group_id)
);

create index if not exists project_grades_project_idx
  on public.project_grades (project_id, group_id);

alter table public.project_grades enable row level security;

-- Professor dono da UC do projeto gerencia (insere/atualiza a nota).
drop policy if exists "dono gerencia notas do projeto" on public.project_grades;
create policy "dono gerencia notas do projeto" on public.project_grades
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_grades.project_id
        and public.owns_class_unit(p.class_unit_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_grades.project_id
        and public.owns_class_unit(p.class_unit_id, auth.uid())
    )
  );

-- Aluno membro do grupo lê a nota/feedback do próprio grupo.
drop policy if exists "aluno le nota do seu grupo" on public.project_grades;
create policy "aluno le nota do seu grupo" on public.project_grades
  for select using (public.is_group_member(group_id, auth.uid()));

-- ###################### 20250101000048_no_xp_para_colagem.sql ######################
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

-- ###################### 20250101000049_missoes_diarias.sql ######################
-- =============================================================================
-- Resgate de MISSÕES DIÁRIAS
-- =============================================================================
-- As missões do dia (definidas em código, lib/gamification/missions.ts) dão
-- MOEDAS ao completar. O progresso é derivado da atividade do dia; aqui só
-- registramos o RESGATE (uma vez por missão por dia) pra creditar a moeda uma
-- única vez. A moeda cai em profiles.coins_bonus (mesma economia da loja).
--
-- Idempotente. Aplicar: npx supabase db push
-- =============================================================================

create table if not exists public.daily_mission_claims (
  student_id uuid not null references public.profiles(id) on delete cascade,
  mission_id text not null,
  claim_date date not null,
  reward integer not null default 0,
  claimed_at timestamptz not null default now(),
  primary key (student_id, mission_id, claim_date)
);

alter table public.daily_mission_claims enable row level security;

-- O aluno vê e cria só os próprios resgates.
drop policy if exists "aluno ve seus resgates" on public.daily_mission_claims;
create policy "aluno ve seus resgates" on public.daily_mission_claims
  for select using (auth.uid() = student_id);

drop policy if exists "aluno cria seus resgates" on public.daily_mission_claims;
create policy "aluno cria seus resgates" on public.daily_mission_claims
  for insert with check (auth.uid() = student_id);

-- ###################### 20250101000050_checklist_diario_professor.sql ######################
-- =============================================================================
-- Checklist diário do professor (presença + plano de aula)
-- =============================================================================
-- Lembrete do dia a dia: o professor marca se já fez a CHAMADA e registrou o
-- PLANO DE AULA (na plataforma externa do SENAI). A plataforma não tem como
-- saber do sistema externo, então é uma confirmação MANUAL por dia. Uma linha
-- por (professor, data). Serve pra o painel lembrar do que ainda falta.
--
-- Idempotente. Aplicar: npx supabase db push
-- =============================================================================

create table if not exists public.teacher_daily_checklist (
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  check_date date not null,
  presenca_feita boolean not null default false,
  plano_registrado boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (teacher_id, check_date)
);

alter table public.teacher_daily_checklist enable row level security;

-- O professor vê e mexe só no próprio checklist.
drop policy if exists "professor ve seu checklist" on public.teacher_daily_checklist;
create policy "professor ve seu checklist" on public.teacher_daily_checklist
  for select using (auth.uid() = teacher_id);

drop policy if exists "professor gerencia seu checklist" on public.teacher_daily_checklist;
create policy "professor gerencia seu checklist" on public.teacher_daily_checklist
  for all using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- ###################### 20250101000051_pesquisa_uc.sql ######################
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

-- ###################### 20250101000052_checklist_por_turma.sql ######################
-- =============================================================================
-- Checklist diário POR TURMA (o professor pode dar aula de manhã e de tarde)
-- =============================================================================
-- A versão 0050 tinha 1 linha por (professor, dia) — não distinguia turmas.
-- Um professor com aula de manhã E de tarde precisa marcar chamada+plano de
-- CADA turma. Aqui adicionamos `class_id` e trocamos a PK para
-- (teacher, class, date). As turmas do dia vêm do calendário (calendar_days).
--
-- Migração de dados: as linhas antigas (class_id nulo) permanecem válidas como
-- "geral do dia" mas o app passa a usar por turma. Idempotente.
-- =============================================================================

alter table public.teacher_daily_checklist
  add column if not exists class_id uuid references public.classes(id) on delete cascade;

-- Recria a PK incluindo class_id. Postgres não deixa alterar PK direto; então
-- dropamos a antiga e criamos um índice único que trata NULL como distinto via
-- coalesce num índice de expressão.
do $$
begin
  -- Remove a PK antiga se existir (nome padrão).
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.teacher_daily_checklist'::regclass
      and contype = 'p'
  ) then
    execute (
      select 'alter table public.teacher_daily_checklist drop constraint ' || quote_ident(conname)
      from pg_constraint
      where conrelid = 'public.teacher_daily_checklist'::regclass and contype = 'p'
    );
  end if;
end $$;

-- Unicidade por (professor, turma, dia). coalesce trata a linha "geral" (class
-- nulo) como uma chave própria por dia.
-- NOTA: este índice de expressão foi substituído pela constraint simples na
-- migration 0053 (o upsert do app precisa mirar colunas, não expressão).
create unique index if not exists teacher_daily_checklist_uniq
  on public.teacher_daily_checklist (teacher_id, coalesce(class_id, '00000000-0000-0000-0000-000000000000'::uuid), check_date);

-- ###################### 20250101000053_checklist_constraint_repair.sql ######################
-- =============================================================================
-- Repara a constraint do checklist por turma (0052 deixou índice de expressão)
-- =============================================================================
-- A 0052 criou um índice único por expressão (coalesce), que o upsert do app
-- (onConflict teacher_id,class_id,check_date) NÃO consegue mirar. Trocamos por
-- uma constraint única simples nas 3 colunas. Idempotente.
-- =============================================================================

-- Remove linhas legadas sem turma e torna class_id obrigatório.
delete from public.teacher_daily_checklist where class_id is null;
alter table public.teacher_daily_checklist alter column class_id set not null;

-- Remove o índice de expressão da 0052 (se existir).
drop index if exists public.teacher_daily_checklist_uniq;

-- Constraint única simples que o upsert usa.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.teacher_daily_checklist'::regclass
      and conname = 'teacher_daily_checklist_teacher_class_date_key'
  ) then
    alter table public.teacher_daily_checklist
      add constraint teacher_daily_checklist_teacher_class_date_key
      unique (teacher_id, class_id, check_date);
  end if;
end $$;

-- ###################### 20250101000054_catalogo_exercicios.sql ######################
-- =============================================================================
-- Catálogo de exercícios compartilhado entre professores
-- =============================================================================
-- Até aqui um exercício só tocava uma UC indiretamente (quando anexado a uma
-- lista de uma turma). Para virar um BANCO catalogável — onde o professor
-- encontra exercícios de colegas por curso/UC/dificuldade/prova e aplica na sua
-- própria turma — o exercício precisa de metadado de catálogo próprio:
--
--   1. is_exam_suitable  → flag "sugerido para prova" (etiqueta/filtro; NÃO muda
--                          comportamento de correção nem liga o modo prova).
--   2. exercise_units     → vínculo N:N exercício ↔ UC(s) do plano de curso
--                          (curricular_units). Curso é derivado via módulo.
--
-- A leitura de exercícios públicos de qualquer autor já era permitida pela RLS
-- (migration 0001: "is_public or author_id = auth.uid()"), então o catálogo
-- compartilhado já lê exercícios de todos os professores. Aqui só adicionamos a
-- catalogação.
--
-- Aditiva e idempotente. Aplicar com: npx supabase db push
-- =============================================================================

-- 1. Flag "sugerido para prova" ------------------------------------------------
alter table public.exercises
  add column if not exists is_exam_suitable boolean not null default false;

-- 2. Vínculo N:N exercício ↔ UC ------------------------------------------------
create table if not exists public.exercise_units (
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  uc_id uuid not null references public.curricular_units(id) on delete cascade,
  primary key (exercise_id, uc_id)
);
create index if not exists exercise_units_uc_idx on public.exercise_units (uc_id);
create index if not exists exercise_units_exercise_idx on public.exercise_units (exercise_id);

alter table public.exercise_units enable row level security;

-- Leitura: qualquer professor (o catálogo é do corpo docente) OU quem já pode
-- ver o exercício (público ou autor) — cobre a página do exercício p/ o aluno.
drop policy if exists "ler exercise_units" on public.exercise_units;
create policy "ler exercise_units" on public.exercise_units
  for select using (
    public.is_professor(auth.uid())
    or exists (
      select 1 from public.exercises e
      where e.id = exercise_units.exercise_id
        and (e.is_public or e.author_id = auth.uid())
    )
  );

-- Escrita: só o autor do exercício cataloga o próprio exercício.
drop policy if exists "autor cataloga exercise_units" on public.exercise_units;
create policy "autor cataloga exercise_units" on public.exercise_units
  for all using (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_units.exercise_id and e.author_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_units.exercise_id and e.author_id = auth.uid()
    )
  );

-- 3. Verificação ---------------------------------------------------------------
select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'exercises'
      and column_name = 'is_exam_suitable'
  ) as coluna_prova_ok,
  exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'exercise_units'
  ) as tabela_exercise_units_ok,
  exists (
    select 1 from pg_policies
    where tablename = 'exercise_units' and policyname = 'ler exercise_units'
  ) as policy_leitura_ok;


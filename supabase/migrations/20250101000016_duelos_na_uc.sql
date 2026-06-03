-- =============================================================================
-- Duelos descem para a UC + ELO contextual (por turma × UC)
-- =============================================================================
-- Antes: duels.exercise_id apontava direto pro exercício e o ELO era GLOBAL
-- (profiles.duel_rating) — um aluno duelava só com colegas mas competia num
-- ranking com a plataforma inteira. Agora o duelo acontece DENTRO de um
-- class_unit (turma × UC) e o rating é calculado nesse contexto.
--
-- - duels.class_unit_id (nullable na fase 1; backfill quando possível)
-- - nova tabela duel_ratings (student_id, class_unit_id) — ranking contextual
-- - profiles.duel_rating/_wins/_losses ficam por compat (Fase 2 remove)
--
-- Idempotente. Aplicar com: npx supabase db push
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. duels ganha o contexto da UC
-- -----------------------------------------------------------------------------
alter table public.duels
  add column if not exists class_unit_id uuid references public.class_units(id) on delete cascade;

create index if not exists duels_class_unit_idx on public.duels (class_unit_id);

-- Backfill: se ambos os participantes pertencem a EXATAMENTE um class_unit em
-- comum, vinculamos. Caso contrário deixamos null (duelo "legado" global) — a
-- UI nova só cria duelos já com class_unit_id.
do $$
declare d record; v_cu uuid; v_n int;
begin
  for d in select id, challenger_id, opponent_id from public.duels where class_unit_id is null and opponent_id is not null loop
    select count(*) into v_n
    from public.class_units cu
    where exists (select 1 from public.class_members m where m.class_id = cu.class_id and m.student_id = d.challenger_id)
      and exists (select 1 from public.class_members m where m.class_id = cu.class_id and m.student_id = d.opponent_id);
    select cu.id into v_cu
    from public.class_units cu
    where exists (select 1 from public.class_members m where m.class_id = cu.class_id and m.student_id = d.challenger_id)
      and exists (select 1 from public.class_members m where m.class_id = cu.class_id and m.student_id = d.opponent_id)
    order by cu.created_at limit 1;
    if v_n = 1 then
      update public.duels set class_unit_id = v_cu where id = d.id;
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Ranking contextual de duelos
-- -----------------------------------------------------------------------------
create table if not exists public.duel_ratings (
  student_id uuid not null references public.profiles(id) on delete cascade,
  class_unit_id uuid not null references public.class_units(id) on delete cascade,
  rating integer not null default 1000,
  wins integer not null default 0,
  losses integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (student_id, class_unit_id)
);
create index if not exists duel_ratings_ranking_idx
  on public.duel_ratings (class_unit_id, rating desc);

alter table public.duel_ratings enable row level security;

-- O aluno vê o ranking da UC em que está; o professor vê o das suas turmas.
-- A escrita do rating é feita pelo service role (admin client), então não há
-- policy de insert/update para o usuário comum.
drop policy if exists "ve ranking de duelos da uc" on public.duel_ratings;
create policy "ve ranking de duelos da uc" on public.duel_ratings
  for select using (
    public.member_of_class_unit(class_unit_id, auth.uid())
    or public.owns_class_unit(class_unit_id, auth.uid())
  );

-- -----------------------------------------------------------------------------
-- 3. RLS de duels: participantes leem; quem cria precisa pertencer à UC.
-- -----------------------------------------------------------------------------
-- A leitura por participante continua valendo. Adicionamos que o professor dono
-- da UC enxerga os duelos da sua turma (para acompanhamento/dashboard).
drop policy if exists "professor ve duelos da sua uc" on public.duels;
create policy "professor ve duelos da sua uc" on public.duels
  for select using (
    class_unit_id is not null and public.owns_class_unit(class_unit_id, auth.uid())
  );

-- Criar duelo: além de ser o challenger, se houver class_unit_id ele precisa ser
-- membro daquela UC (impede criar duelo numa turma que não é sua).
drop policy if exists "criar duelo como challenger" on public.duels;
create policy "criar duelo como challenger" on public.duels
  for insert with check (
    auth.uid() = challenger_id and (
      class_unit_id is null or public.member_of_class_unit(class_unit_id, auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- 4. Verificação
-- -----------------------------------------------------------------------------
select
  exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='duels' and column_name='class_unit_id') as duels_tem_uc,
  exists (select 1 from information_schema.tables
    where table_schema='public' and table_name='duel_ratings') as tabela_ratings_ok,
  (select count(*) from public.duels where opponent_id is not null and class_unit_id is null) as duelos_sem_uc;

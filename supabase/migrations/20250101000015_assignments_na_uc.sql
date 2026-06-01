-- =============================================================================
-- Atividades descem para a UC: assignments.class_unit_id (turma × UC)
-- =============================================================================
-- Mudança de modelo: a plataforma deixou de ser "Duolingo" (exercícios soltos,
-- atribuições por turma) para ser orientada a CURSO → UC → TURMA. Toda atividade
-- (lista, prova, desafio, duelo, Unity, projeto integrador, SAEP) passa a viver
-- DENTRO de uma UC executada numa turma — ou seja, num class_unit.
--
-- O banco de exercícios (public.exercises) CONTINUA reutilizável (do autor,
-- clonável entre UCs/turmas). Só a ATRIBUIÇÃO ganha o vínculo com a UC.
--
-- Fase 1 (esta migration): aditiva e sem quebrar.
--   - assignments.class_unit_id NULLABLE + backfill a partir de class_id
--   - assignments.teaching_plan_block_id (atrela à faixa de aulas, opcional)
--   - amplia assignment_kind com 'duelo','unity','projeto_integrador'
--   - RLS de assignments/submissions passa a aceitar o caminho via class_unit
--     (mantém o caminho antigo via class_id enquanto a coluna é opcional)
--
-- A Fase 2 (migration futura) torna class_unit_id NOT NULL e remove class_id,
-- depois que a UI estiver migrada e os dados conferidos.
--
-- Idempotente. Aplicar com: npx supabase db push
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Novas colunas em assignments
-- -----------------------------------------------------------------------------
alter table public.assignments
  add column if not exists class_unit_id uuid references public.class_units(id) on delete cascade,
  add column if not exists teaching_plan_block_id uuid references public.teaching_plan_blocks(id) on delete set null;

create index if not exists assignments_class_unit_idx on public.assignments (class_unit_id);

-- Novos tipos de atividade. ALTER TYPE ... ADD VALUE não roda dentro de bloco
-- transacional junto com uso do valor, então adicionamos um por vez, idempotente.
do $$ begin alter type public.assignment_kind add value if not exists 'duelo'; exception when others then null; end $$;
do $$ begin alter type public.assignment_kind add value if not exists 'unity'; exception when others then null; end $$;
do $$ begin alter type public.assignment_kind add value if not exists 'projeto_integrador'; exception when others then null; end $$;

-- -----------------------------------------------------------------------------
-- 2. Backfill: cada assignment antigo (só com class_id) recebe um class_unit.
-- -----------------------------------------------------------------------------
-- Estratégia conservadora: se a turma já tem EXATAMENTE UM class_unit, usamos
-- ele. Se tem vários (ou nenhum), criamos/garantimos uma UC "Geral" por turma
-- e penduramos lá, para não inventar vínculo curricular errado. O professor
-- pode reclassificar depois na UI.
do $$
declare
  a record;
  v_class_unit uuid;
  v_count int;
  v_general_course uuid;
  v_general_module uuid;
  v_general_uc uuid;
begin
  for a in
    select id, class_id from public.assignments
    where class_unit_id is null and class_id is not null
  loop
    select count(*) into v_count
    from public.class_units cu where cu.class_id = a.class_id;
    select cu.id into v_class_unit
    from public.class_units cu where cu.class_id = a.class_id
    order by cu.created_at limit 1;

    if v_count = 1 then
      update public.assignments set class_unit_id = v_class_unit where id = a.id;
      continue;
    end if;

    -- Garante a UC "Geral" (curso/módulo/UC placeholder) e o class_unit da turma.
    if v_general_uc is null then
      select id into v_general_course from public.courses where name = 'Geral (migrado)' limit 1;
      if v_general_course is null then
        insert into public.courses (name, description, is_public)
        values ('Geral (migrado)', 'Curso placeholder criado na migração de atividades para UC. Reclassifique as atividades.', false)
        returning id into v_general_course;
      end if;

      select id into v_general_module from public.course_modules where course_id = v_general_course and name = 'Geral' limit 1;
      if v_general_module is null then
        insert into public.course_modules (course_id, name, ord)
        values (v_general_course, 'Geral', 0) returning id into v_general_module;
      end if;

      select id into v_general_uc from public.curricular_units where module_id = v_general_module and title = 'Atividades gerais' limit 1;
      if v_general_uc is null then
        insert into public.curricular_units (module_id, title, ord)
        values (v_general_module, 'Atividades gerais', 0) returning id into v_general_uc;
      end if;
    end if;

    -- class_unit dessa turma com a UC geral (único por class_id, uc_id).
    select id into v_class_unit from public.class_units
    where class_id = a.class_id and uc_id = v_general_uc limit 1;
    if v_class_unit is null then
      insert into public.class_units (class_id, uc_id)
      values (a.class_id, v_general_uc) returning id into v_class_unit;
    end if;

    update public.assignments set class_unit_id = v_class_unit where id = a.id;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Helpers SECURITY DEFINER (evitam recursão de RLS; padrão do projeto)
-- -----------------------------------------------------------------------------
-- "A turma deste class_unit é do professor atual?"
create or replace function public.owns_class_unit(target_class_unit uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.class_units cu
    join public.classes c on c.id = cu.class_id
    where cu.id = target_class_unit and c.owner_id = uid)
$$;

-- "O aluno é membro da turma deste class_unit?"
create or replace function public.member_of_class_unit(target_class_unit uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.class_units cu
    join public.class_members m on m.class_id = cu.class_id
    where cu.id = target_class_unit and m.student_id = uid)
$$;

-- -----------------------------------------------------------------------------
-- 4. RLS de assignments — aceita os DOIS caminhos enquanto class_unit_id é opcional.
-- -----------------------------------------------------------------------------
drop policy if exists "dono gerencia assignments" on public.assignments;
create policy "dono gerencia assignments" on public.assignments
  for all using (
    (class_unit_id is not null and public.owns_class_unit(class_unit_id, auth.uid()))
    or (class_id is not null and public.is_class_owner(class_id, auth.uid()))
  ) with check (
    (class_unit_id is not null and public.owns_class_unit(class_unit_id, auth.uid()))
    or (class_id is not null and public.is_class_owner(class_id, auth.uid()))
  );

drop policy if exists "aluno le assignments da sua turma" on public.assignments;
create policy "aluno le assignments da sua turma" on public.assignments
  for select using (
    (class_unit_id is not null and public.member_of_class_unit(class_unit_id, auth.uid()))
    or (class_id is not null and public.is_class_member(class_id, auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- 5. submissions — professor lê via class_unit também (mantém o caminho antigo).
-- -----------------------------------------------------------------------------
drop policy if exists "professor ve submissoes da sua turma" on public.submissions;
create policy "professor ve submissoes da sua turma" on public.submissions
  for select using (
    public.is_professor(auth.uid()) and exists (
      select 1 from public.assignments a
      where a.id = submissions.assignment_id and (
        (a.class_unit_id is not null and public.owns_class_unit(a.class_unit_id, auth.uid()))
        or (a.class_id is not null and public.is_class_owner(a.class_id, auth.uid()))
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 6. Verificação
-- -----------------------------------------------------------------------------
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'assignments'
      and column_name in ('class_unit_id','teaching_plan_block_id')) as colunas_novas,
  (select count(*) from public.assignments where class_id is not null and class_unit_id is null) as assignments_sem_uc,
  exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
          where t.typname = 'assignment_kind' and e.enumlabel = 'unity') as kind_unity_ok;

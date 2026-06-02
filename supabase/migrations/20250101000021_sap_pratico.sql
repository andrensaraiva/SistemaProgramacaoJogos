-- =============================================================================
-- SAP prático — prova prática avaliada por lista de verificação (rubrica)
-- =============================================================================
-- O SAP é a prova PRÁTICA do SENAI: o aluno entrega um artefato (jogo/build/GDD/
-- código) e o avaliador preenche uma LISTA DE VERIFICAÇÃO com a hierarquia:
--
--   UNIDADE (ex: "1 - Produzir elementos multimídia...")
--    └─ ELEMENTO (ex: "1.2 - Criar elementos...")
--        └─ CRITÉRIO / Padrão de desempenho (ex: "1.2.1 - Seguindo métodos...")
--            └─ ITEM / evidência observável (Sim/Não + justificativa, com pontos)
--
-- A RUBRICA VARIA POR DESAFIO — então ela vive DENTRO da atividade (não é
-- template por curso). O SAP prático é uma atividade da UC (kind='sap_pratico').
--
--   SAP_ASSESSMENT (1:1 com a atividade) -> units -> elements -> criteria -> items
--   Aluno entrega (reusa submissions). Professor avalia por aluno:
--   SAP_EVALUATION (aluno x assessment) -> SAP_ITEM_MARKS (Sim/Não/justificativa).
--
-- Itens podem mapear à matriz (competency/knowledge_object) -> dashboard.
-- Reusa helpers owns_class_unit / member_of_class_unit. Aditiva e idempotente.
-- Aplicar: npx supabase db push
-- =============================================================================

do $$ begin alter type public.assignment_kind add value if not exists 'sap_pratico'; exception when others then null; end $$;

-- -----------------------------------------------------------------------------
-- 1. SAP ASSESSMENT (1:1 com a atividade) + RUBRICA (árvore)
-- -----------------------------------------------------------------------------
create table if not exists public.sap_assessments (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.assignments(id) on delete cascade,
  class_unit_id uuid not null references public.class_units(id) on delete cascade,
  title text not null,
  description text,                       -- enunciado do desafio (markdown)
  max_score numeric,                      -- nota cheia (ex: 10) — informativo
  created_at timestamptz not null default now()
);
create index if not exists sap_assessments_class_unit_idx on public.sap_assessments (class_unit_id);

create table if not exists public.sap_units (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.sap_assessments(id) on delete cascade,
  code text,                              -- ex: "1"
  title text not null,
  ord integer not null default 0
);
create index if not exists sap_units_assessment_idx on public.sap_units (assessment_id, ord);

create table if not exists public.sap_elements (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.sap_units(id) on delete cascade,
  code text,                              -- ex: "1.2"
  title text not null,
  ord integer not null default 0
);
create index if not exists sap_elements_unit_idx on public.sap_elements (unit_id, ord);

create table if not exists public.sap_criteria (
  id uuid primary key default gen_random_uuid(),
  element_id uuid not null references public.sap_elements(id) on delete cascade,
  code text,                              -- ex: "1.2.1"
  description text not null,              -- padrão de desempenho
  ord integer not null default 0
);
create index if not exists sap_criteria_element_idx on public.sap_criteria (element_id, ord);

create table if not exists public.sap_items (
  id uuid primary key default gen_random_uuid(),
  criterion_id uuid not null references public.sap_criteria(id) on delete cascade,
  code text,                              -- ex: "1.2.1.1"
  description text not null,              -- evidência observável (Sim/Não)
  points numeric not null default 1,      -- peso do item na nota
  competency_id uuid references public.competencies(id) on delete set null,
  knowledge_object_id uuid references public.knowledge_objects(id) on delete set null,
  ord integer not null default 0
);
create index if not exists sap_items_criterion_idx on public.sap_items (criterion_id, ord);

-- -----------------------------------------------------------------------------
-- 2. AVALIAÇÃO por aluno (preenchida pelo professor)
-- -----------------------------------------------------------------------------
create table if not exists public.sap_evaluations (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.sap_assessments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  submission_link text,                   -- link da entrega do aluno (build/GDD/código)
  submitted_at timestamptz,               -- quando o aluno entregou
  score numeric,                          -- soma dos pontos dos itens "Sim"
  max_score numeric,                      -- soma de todos os pontos (denominador)
  feedback text,
  evaluated_at timestamptz,
  unique (assessment_id, student_id)
);
create index if not exists sap_evaluations_assessment_idx on public.sap_evaluations (assessment_id);
create index if not exists sap_evaluations_student_idx on public.sap_evaluations (student_id);

create table if not exists public.sap_item_marks (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.sap_evaluations(id) on delete cascade,
  item_id uuid not null references public.sap_items(id) on delete cascade,
  met boolean not null default false,     -- Sim = true, Não = false
  justification text,                     -- justificativa do "Não"
  unique (evaluation_id, item_id)
);
create index if not exists sap_item_marks_eval_idx on public.sap_item_marks (evaluation_id);

-- -----------------------------------------------------------------------------
-- 3. RLS
-- -----------------------------------------------------------------------------
alter table public.sap_assessments enable row level security;
alter table public.sap_units enable row level security;
alter table public.sap_elements enable row level security;
alter table public.sap_criteria enable row level security;
alter table public.sap_items enable row level security;
alter table public.sap_evaluations enable row level security;
alter table public.sap_item_marks enable row level security;

-- ASSESSMENT: dono da UC gerencia; aluno membro lê (enunciado).
drop policy if exists "dono gerencia sap_assessments" on public.sap_assessments;
create policy "dono gerencia sap_assessments" on public.sap_assessments
  for all using (public.owns_class_unit(class_unit_id, auth.uid()))
  with check (public.owns_class_unit(class_unit_id, auth.uid()));
drop policy if exists "aluno le sap_assessments da sua uc" on public.sap_assessments;
create policy "aluno le sap_assessments da sua uc" on public.sap_assessments
  for select using (public.member_of_class_unit(class_unit_id, auth.uid()));

-- Rubrica (units/elements/criteria/items): dono gerencia via assessment->UC;
-- aluno membro lê (vê os critérios pelos quais será avaliado). Policies escritas
-- com EXISTS encadeado até o assessment (sem recursão de RLS).
-- units
drop policy if exists "dono gerencia sap_units" on public.sap_units;
create policy "dono gerencia sap_units" on public.sap_units for all
  using (exists (select 1 from public.sap_assessments a where a.id = assessment_id and public.owns_class_unit(a.class_unit_id, auth.uid())))
  with check (exists (select 1 from public.sap_assessments a where a.id = assessment_id and public.owns_class_unit(a.class_unit_id, auth.uid())));
drop policy if exists "aluno le sap_units" on public.sap_units;
create policy "aluno le sap_units" on public.sap_units for select
  using (exists (select 1 from public.sap_assessments a where a.id = assessment_id and public.member_of_class_unit(a.class_unit_id, auth.uid())));

-- elements
drop policy if exists "dono gerencia sap_elements" on public.sap_elements;
create policy "dono gerencia sap_elements" on public.sap_elements for all
  using (exists (select 1 from public.sap_units u join public.sap_assessments a on a.id = u.assessment_id where u.id = unit_id and public.owns_class_unit(a.class_unit_id, auth.uid())))
  with check (exists (select 1 from public.sap_units u join public.sap_assessments a on a.id = u.assessment_id where u.id = unit_id and public.owns_class_unit(a.class_unit_id, auth.uid())));
drop policy if exists "aluno le sap_elements" on public.sap_elements;
create policy "aluno le sap_elements" on public.sap_elements for select
  using (exists (select 1 from public.sap_units u join public.sap_assessments a on a.id = u.assessment_id where u.id = unit_id and public.member_of_class_unit(a.class_unit_id, auth.uid())));

-- criteria
drop policy if exists "dono gerencia sap_criteria" on public.sap_criteria;
create policy "dono gerencia sap_criteria" on public.sap_criteria for all
  using (exists (select 1 from public.sap_elements e join public.sap_units u on u.id = e.unit_id join public.sap_assessments a on a.id = u.assessment_id where e.id = element_id and public.owns_class_unit(a.class_unit_id, auth.uid())))
  with check (exists (select 1 from public.sap_elements e join public.sap_units u on u.id = e.unit_id join public.sap_assessments a on a.id = u.assessment_id where e.id = element_id and public.owns_class_unit(a.class_unit_id, auth.uid())));
drop policy if exists "aluno le sap_criteria" on public.sap_criteria;
create policy "aluno le sap_criteria" on public.sap_criteria for select
  using (exists (select 1 from public.sap_elements e join public.sap_units u on u.id = e.unit_id join public.sap_assessments a on a.id = u.assessment_id where e.id = element_id and public.member_of_class_unit(a.class_unit_id, auth.uid())));

-- items
drop policy if exists "dono gerencia sap_items" on public.sap_items;
create policy "dono gerencia sap_items" on public.sap_items for all
  using (exists (select 1 from public.sap_criteria c join public.sap_elements e on e.id = c.element_id join public.sap_units u on u.id = e.unit_id join public.sap_assessments a on a.id = u.assessment_id where c.id = criterion_id and public.owns_class_unit(a.class_unit_id, auth.uid())))
  with check (exists (select 1 from public.sap_criteria c join public.sap_elements e on e.id = c.element_id join public.sap_units u on u.id = e.unit_id join public.sap_assessments a on a.id = u.assessment_id where c.id = criterion_id and public.owns_class_unit(a.class_unit_id, auth.uid())));
drop policy if exists "aluno le sap_items" on public.sap_items;
create policy "aluno le sap_items" on public.sap_items for select
  using (exists (select 1 from public.sap_criteria c join public.sap_elements e on e.id = c.element_id join public.sap_units u on u.id = e.unit_id join public.sap_assessments a on a.id = u.assessment_id where c.id = criterion_id and public.member_of_class_unit(a.class_unit_id, auth.uid())));

-- AVALIAÇÃO: dono gerencia (preenche); aluno vê a sua (nota/feedback).
drop policy if exists "dono gerencia sap_evaluations" on public.sap_evaluations;
create policy "dono gerencia sap_evaluations" on public.sap_evaluations for all
  using (exists (select 1 from public.sap_assessments a where a.id = assessment_id and public.owns_class_unit(a.class_unit_id, auth.uid())))
  with check (exists (select 1 from public.sap_assessments a where a.id = assessment_id and public.owns_class_unit(a.class_unit_id, auth.uid())));
drop policy if exists "aluno ve sua sap_evaluation" on public.sap_evaluations;
create policy "aluno ve sua sap_evaluation" on public.sap_evaluations for select
  using (student_id = auth.uid());

-- MARKS: dono gerencia via avaliação->assessment->UC; aluno vê os seus.
drop policy if exists "dono gerencia sap_item_marks" on public.sap_item_marks;
create policy "dono gerencia sap_item_marks" on public.sap_item_marks for all
  using (exists (select 1 from public.sap_evaluations ev join public.sap_assessments a on a.id = ev.assessment_id where ev.id = evaluation_id and public.owns_class_unit(a.class_unit_id, auth.uid())))
  with check (exists (select 1 from public.sap_evaluations ev join public.sap_assessments a on a.id = ev.assessment_id where ev.id = evaluation_id and public.owns_class_unit(a.class_unit_id, auth.uid())));
drop policy if exists "aluno ve seus sap_item_marks" on public.sap_item_marks;
create policy "aluno ve seus sap_item_marks" on public.sap_item_marks for select
  using (exists (select 1 from public.sap_evaluations ev where ev.id = evaluation_id and ev.student_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- 4. Verificação
-- -----------------------------------------------------------------------------
select
  (select count(*) from information_schema.tables where table_schema='public'
    and table_name in ('sap_assessments','sap_units','sap_elements','sap_criteria',
      'sap_items','sap_evaluations','sap_item_marks')) as tabelas_sap,
  exists (select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid
          where t.typname='assignment_kind' and e.enumlabel='sap_pratico') as kind_sap_ok;

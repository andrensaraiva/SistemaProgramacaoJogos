-- =============================================================================
-- Fase 8 — Camada Curricular (PPC → Plano de Ensino → Turma)
-- =============================================================================
-- Transforma os PDFs estáticos (PPC, Plano de Ensino, Lista de Presença) em
-- estrutura viva na plataforma:
--
--   CURSO (compartilhado entre professores)
--    └─ MÓDULO (Introdutório, Específico I/II...)
--        └─ UNIDADE CURRICULAR (UC) — carga horária, objetivo, habilidades,
--           objetos de conhecimento, bibliografia
--
--   PLANO DE ENSINO (do professor, clonável por colegas)
--    └─ BLOCO/AULA (faixa "Aulas 01–12", conteúdo, apresentação, atividade)
--
--   TURMA: vínculo turma↔UC↔plano + FREQUÊNCIA (grade aluno × aula).
--
-- Aditiva e idempotente. Depende de profiles/classes/class_members + is_professor
-- (migrations 0001/0002). Pode rodar mais de uma vez.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CURSO + MÓDULOS + UC (camada PPC, compartilhada)
-- -----------------------------------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  name text not null,
  description text,
  eixo text,                              -- ex: "Informação e Comunicação"
  carga_horaria_total integer,            -- horas
  is_public boolean not null default true,  -- compartilhado entre professores
  created_at timestamptz not null default now()
);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,                     -- ex: "Específico I"
  ord integer not null default 0
);
create index if not exists course_modules_course_idx on public.course_modules (course_id, ord);

create table if not exists public.curricular_units (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  carga_horaria_h integer,                -- horas da UC (ex: 40)
  objetivo_geral text,
  ord integer not null default 0
);
create index if not exists curricular_units_module_idx on public.curricular_units (module_id, ord);

do $$ begin
  create type public.capability_kind as enum ('tecnica', 'socioemocional', 'basica');
exception when duplicate_object then null; end $$;

create table if not exists public.uc_capabilities (
  id uuid primary key default gen_random_uuid(),
  uc_id uuid not null references public.curricular_units(id) on delete cascade,
  code text,                              -- ex: "H117"
  description text not null,
  kind public.capability_kind not null default 'tecnica',
  ord integer not null default 0
);
create index if not exists uc_capabilities_uc_idx on public.uc_capabilities (uc_id, ord);

-- Objetos de conhecimento — árvore (parent_id self-fk)
create table if not exists public.uc_knowledge (
  id uuid primary key default gen_random_uuid(),
  uc_id uuid not null references public.curricular_units(id) on delete cascade,
  parent_id uuid references public.uc_knowledge(id) on delete cascade,
  text text not null,
  ord integer not null default 0
);
create index if not exists uc_knowledge_uc_idx on public.uc_knowledge (uc_id, ord);

do $$ begin
  create type public.bibliography_kind as enum ('basica', 'complementar');
exception when duplicate_object then null; end $$;

create table if not exists public.uc_bibliography (
  id uuid primary key default gen_random_uuid(),
  uc_id uuid not null references public.curricular_units(id) on delete cascade,
  reference text not null,
  tipo public.bibliography_kind not null default 'basica',
  ord integer not null default 0
);
create index if not exists uc_bibliography_uc_idx on public.uc_bibliography (uc_id, ord);

-- -----------------------------------------------------------------------------
-- 2. PLANO DE ENSINO (do professor, clonável)
-- -----------------------------------------------------------------------------
create table if not exists public.teaching_plans (
  id uuid primary key default gen_random_uuid(),
  uc_id uuid not null references public.curricular_units(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  cloned_from uuid references public.teaching_plans(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists teaching_plans_uc_idx on public.teaching_plans (uc_id);
create index if not exists teaching_plans_owner_idx on public.teaching_plans (owner_id);

create table if not exists public.teaching_plan_blocks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.teaching_plans(id) on delete cascade,
  title text not null,                    -- ex: "Bloco 01 — Aulas 01–12"
  aula_inicio integer,
  aula_fim integer,
  conteudo text,                          -- markdown
  apresentacao_url text,
  atividade text,                         -- markdown
  criterios text,                         -- markdown
  ord integer not null default 0
);
create index if not exists teaching_plan_blocks_plan_idx on public.teaching_plan_blocks (plan_id, ord);

-- -----------------------------------------------------------------------------
-- 3. EXECUÇÃO NA TURMA + FREQUÊNCIA
-- -----------------------------------------------------------------------------
-- Liga uma UC (e o plano escolhido) a uma turma. Única por (class_id, uc_id).
create table if not exists public.class_units (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  uc_id uuid not null references public.curricular_units(id) on delete cascade,
  teaching_plan_id uuid references public.teaching_plans(id) on delete set null,
  serie text,                             -- ex: "3ª"
  created_at timestamptz not null default now(),
  unique (class_id, uc_id)
);
create index if not exists class_units_class_idx on public.class_units (class_id);

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  class_unit_id uuid not null references public.class_units(id) on delete cascade,
  session_number integer not null,        -- número da aula (1, 2, 3...)
  date date,
  label text,
  unique (class_unit_id, session_number)
);
create index if not exists attendance_sessions_cu_idx on public.attendance_sessions (class_unit_id, session_number);

do $$ begin
  create type public.attendance_status as enum ('presente', 'falta', 'atraso');
exception when duplicate_object then null; end $$;

create table if not exists public.attendance_marks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status public.attendance_status not null default 'presente',
  unique (session_id, student_id)
);
create index if not exists attendance_marks_session_idx on public.attendance_marks (session_id);

-- -----------------------------------------------------------------------------
-- 4. RLS
-- -----------------------------------------------------------------------------
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

-- Helper: o curso é editável pelo professor atual (autor)?
create or replace function public.owns_course(course uuid)
returns boolean language sql stable as $$
  select exists (select 1 from public.courses c where c.id = course and c.author_id = auth.uid())
$$;

-- --- CURSO e filhos: leitura para professor (compartilhado); escrita só do autor.
drop policy if exists "professor le cursos" on public.courses;
create policy "professor le cursos" on public.courses
  for select using (is_public or author_id = auth.uid() or public.is_professor(auth.uid()));
drop policy if exists "autor gerencia curso" on public.courses;
create policy "autor gerencia curso" on public.courses
  for all using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists "professor le modulos" on public.course_modules;
create policy "professor le modulos" on public.course_modules
  for select using (public.is_professor(auth.uid()));
drop policy if exists "autor gerencia modulos" on public.course_modules;
create policy "autor gerencia modulos" on public.course_modules
  for all using (public.owns_course(course_id)) with check (public.owns_course(course_id));

-- UC: leitura para professor; escrita do autor do curso (via módulo → curso).
drop policy if exists "professor le ucs" on public.curricular_units;
create policy "professor le ucs" on public.curricular_units
  for select using (public.is_professor(auth.uid()));
drop policy if exists "autor gerencia ucs" on public.curricular_units;
create policy "autor gerencia ucs" on public.curricular_units
  for all using (exists (
    select 1 from public.course_modules m
    where m.id = module_id and public.owns_course(m.course_id)
  )) with check (exists (
    select 1 from public.course_modules m
    where m.id = module_id and public.owns_course(m.course_id)
  ));

-- Habilidades / conhecimentos / bibliografia: leitura professor; escrita do autor (via UC→módulo→curso).
do $$
declare t text;
begin
  foreach t in array array['uc_capabilities','uc_knowledge','uc_bibliography'] loop
    execute format('drop policy if exists "professor le %1$s" on public.%1$I', t);
    execute format(
      'create policy "professor le %1$s" on public.%1$I for select using (public.is_professor(auth.uid()))', t);
    execute format('drop policy if exists "autor gerencia %1$s" on public.%1$I', t);
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

-- --- PLANO DE ENSINO: leitura para professor (para clonar); escrita só do dono.
drop policy if exists "professor le planos" on public.teaching_plans;
create policy "professor le planos" on public.teaching_plans
  for select using (public.is_professor(auth.uid()));
drop policy if exists "dono gerencia planos" on public.teaching_plans;
create policy "dono gerencia planos" on public.teaching_plans
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "professor le blocos" on public.teaching_plan_blocks;
create policy "professor le blocos" on public.teaching_plan_blocks
  for select using (public.is_professor(auth.uid()));
drop policy if exists "dono gerencia blocos" on public.teaching_plan_blocks;
create policy "dono gerencia blocos" on public.teaching_plan_blocks
  for all using (exists (
    select 1 from public.teaching_plans p where p.id = plan_id and p.owner_id = auth.uid()
  )) with check (exists (
    select 1 from public.teaching_plans p where p.id = plan_id and p.owner_id = auth.uid()
  ));

-- --- TURMA: dono da turma gerencia vínculos e frequência; aluno lê o que é seu.
drop policy if exists "dono gerencia class_units" on public.class_units;
create policy "dono gerencia class_units" on public.class_units
  for all using (exists (
    select 1 from public.classes c where c.id = class_id and c.owner_id = auth.uid()
  )) with check (exists (
    select 1 from public.classes c where c.id = class_id and c.owner_id = auth.uid()
  ));
drop policy if exists "aluno le class_units da sua turma" on public.class_units;
create policy "aluno le class_units da sua turma" on public.class_units
  for select using (exists (
    select 1 from public.class_members cm where cm.class_id = class_units.class_id and cm.student_id = auth.uid()
  ));

drop policy if exists "dono gerencia attendance_sessions" on public.attendance_sessions;
create policy "dono gerencia attendance_sessions" on public.attendance_sessions
  for all using (exists (
    select 1 from public.class_units cu
    join public.classes c on c.id = cu.class_id
    where cu.id = class_unit_id and c.owner_id = auth.uid()
  )) with check (exists (
    select 1 from public.class_units cu
    join public.classes c on c.id = cu.class_id
    where cu.id = class_unit_id and c.owner_id = auth.uid()
  ));

drop policy if exists "dono gerencia attendance_marks" on public.attendance_marks;
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
drop policy if exists "aluno ve sua presenca" on public.attendance_marks;
create policy "aluno ve sua presenca" on public.attendance_marks
  for select using (student_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 5. Verificação
-- -----------------------------------------------------------------------------
select
  (select count(*) from information_schema.tables
    where table_schema = 'public'
      and table_name in ('courses','course_modules','curricular_units','uc_capabilities',
        'uc_knowledge','uc_bibliography','teaching_plans','teaching_plan_blocks',
        'class_units','attendance_sessions','attendance_marks')) as tabelas_curriculo,
  exists (select 1 from pg_type where typname = 'attendance_status') as enum_presenca_ok,
  exists (select 1 from pg_policies where tablename = 'teaching_plans'
            and policyname = 'professor le planos') as policy_clonar_ok;

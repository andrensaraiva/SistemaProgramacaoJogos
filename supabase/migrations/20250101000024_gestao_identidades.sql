-- =============================================================================
-- Gestão de identidades — Celeste Academy
-- =============================================================================
-- Virada de modelo: acabou o cadastro aberto. Admin cria professor; professor
-- cria aluno. Aluno tem 2 emails (pessoal + institucional) e AMBOS logam (o
-- institucional é o canônico no Auth; o login resolve o pessoal para o canônico).
-- Primeiro acesso força troca de senha + completar perfil. Reset de senha é por
-- aprovação, com notificações in-app.
--
-- Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. profiles — novas colunas
-- -----------------------------------------------------------------------------
-- Defaults conservadores para NÃO travar contas já existentes: profile_completed
-- nasce true e must_change_password false. As contas NOVAS (criadas por admin/
-- professor) virão com profile_completed=false / must_change_password=true via
-- metadata (ver handle_new_user abaixo).

alter table public.profiles
  add column if not exists personal_email text,
  add column if not exists institutional_email text,
  add column if not exists must_change_password boolean not null default false,
  add column if not exists profile_completed boolean not null default true,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

-- Unicidade case-insensitive dos emails ENTRE perfis — sem isso o login com o
-- email pessoal/institucional ficaria ambíguo. Índices parciais (ignoram null).
create unique index if not exists profiles_personal_email_uq
  on public.profiles (lower(personal_email)) where personal_email is not null;
create unique index if not exists profiles_institutional_email_uq
  on public.profiles (lower(institutional_email)) where institutional_email is not null;

-- Backfill: para perfis existentes, o email canônico do Auth vira o institucional.
update public.profiles p
set institutional_email = u.email
from auth.users u
where u.id = p.id
  and p.institutional_email is null
  and u.email is not null;

-- -----------------------------------------------------------------------------
-- 2. handle_new_user — propaga os novos campos a partir do metadata
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id, display_name, role,
    personal_email, institutional_email,
    must_change_password, profile_completed, created_by
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'aluno'),
    nullif(new.raw_user_meta_data->>'personal_email', ''),
    coalesce(nullif(new.raw_user_meta_data->>'institutional_email', ''), new.email),
    coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, false),
    coalesce((new.raw_user_meta_data->>'profile_completed')::boolean, true),
    nullif(new.raw_user_meta_data->>'created_by', '')::uuid
  );
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. is_admin — helper SECURITY DEFINER (espelha is_professor)
-- -----------------------------------------------------------------------------

create or replace function public.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = uid and role = 'admin')
$$;

-- profiles: admin lê e altera todos; professor altera (reset/edição) alunos que
-- ensina. As policies de SELECT do professor/aluno já existem (init + 0023).
drop policy if exists "admin le todos os perfis" on public.profiles;
create policy "admin le todos os perfis" on public.profiles
  for select using (public.is_admin(auth.uid()));

drop policy if exists "admin altera todos os perfis" on public.profiles;
create policy "admin altera todos os perfis" on public.profiles
  for update using (public.is_admin(auth.uid())) with check (true);

drop policy if exists "professor altera alunos que ensina" on public.profiles;
create policy "professor altera alunos que ensina" on public.profiles
  for update using (public.teaches_student(auth.uid(), profiles.id)) with check (true);

-- -----------------------------------------------------------------------------
-- 4. password_reset_requests — fila de reset por aprovação
-- -----------------------------------------------------------------------------

do $$ begin
  create type public.reset_status as enum ('pendente', 'aprovado', 'recusado');
exception when duplicate_object then null;
end $$;

create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  requester_role public.user_role not null,
  status public.reset_status not null default 'pendente',
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists prr_requester_idx on public.password_reset_requests (requester_id);
create index if not exists prr_status_idx on public.password_reset_requests (status);

alter table public.password_reset_requests enable row level security;

-- O solicitante lê o próprio pedido.
drop policy if exists "requester le proprio pedido" on public.password_reset_requests;
create policy "requester le proprio pedido" on public.password_reset_requests
  for select using (requester_id = auth.uid());

-- Admin lê e resolve todos.
drop policy if exists "admin gerencia pedidos" on public.password_reset_requests;
create policy "admin gerencia pedidos" on public.password_reset_requests
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Professor lê e resolve pedidos de alunos que ensina.
drop policy if exists "professor gerencia pedidos de seus alunos" on public.password_reset_requests;
create policy "professor gerencia pedidos de seus alunos" on public.password_reset_requests
  for all using (public.teaches_student(auth.uid(), requester_id))
  with check (public.teaches_student(auth.uid(), requester_id));

-- Inserção do próprio pedido (a tela pública usa service-role, mas mantém a
-- policy coerente para quem já está logado e pede reset).
drop policy if exists "requester cria proprio pedido" on public.password_reset_requests;
create policy "requester cria proprio pedido" on public.password_reset_requests
  for insert with check (requester_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 5. notifications — notificações in-app (sino)
-- -----------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, read_at);

alter table public.notifications enable row level security;

drop policy if exists "le as proprias notificacoes" on public.notifications;
create policy "le as proprias notificacoes" on public.notifications
  for select using (recipient_id = auth.uid());

drop policy if exists "atualiza as proprias notificacoes" on public.notifications;
create policy "atualiza as proprias notificacoes" on public.notifications
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Verificação
-- -----------------------------------------------------------------------------
select
  exists (select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'institutional_email') as col_ok,
  exists (select 1 from pg_proc where proname = 'is_admin') as is_admin_ok,
  exists (select 1 from pg_tables where tablename = 'password_reset_requests') as prr_ok,
  exists (select 1 from pg_tables where tablename = 'notifications') as notif_ok;

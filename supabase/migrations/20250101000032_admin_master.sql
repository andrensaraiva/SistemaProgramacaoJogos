-- =============================================================================
-- Admin master vs admin normal — Celeste Academy
-- =============================================================================
-- Dois níveis de admin: o MASTER tem CRUD completo de outros admins (criar,
-- editar, suspender, promover/rebaixar); o admin NORMAL faz todo o resto, menos
-- gerenciar admins. Não cria papel novo (role continua 'admin' em toda a RLS);
-- usa a flag profiles.is_master.
--
-- Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

alter table public.profiles
  add column if not exists is_master boolean not null default false;

-- O admin master do seed (institucional) recebe o flag; ajuste o email se mudar.
update public.profiles p
set is_master = true
from auth.users u
where u.id = p.id
  and p.role = 'admin'
  and u.email = 'admin@celeste.academy';

-- Helper: uid é admin master?
create or replace function public.is_master_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = uid and role = 'admin' and is_master = true)
$$;

select
  exists (select 1 from information_schema.columns
          where table_name = 'profiles' and column_name = 'is_master') as col_ok,
  exists (select 1 from pg_proc where proname = 'is_master_admin') as fn_ok;

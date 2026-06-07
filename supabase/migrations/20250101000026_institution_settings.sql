-- =============================================================================
-- Configurações institucionais (singleton) — Celeste Academy
-- =============================================================================
-- Guarda parâmetros da instituição usados pelos relatórios do admin: nome e os
-- limiares de aprovação/recuperação/frequência (escala de NOTA 0–10). Uma única
-- linha (id fixo). Base para futuras configs (eventos, competições etc.).
--
-- Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

create table if not exists public.institution_settings (
  id boolean primary key default true,            -- trava singleton: só id=true
  institution_name text not null default 'Celeste Academy',
  nota_aprovacao numeric not null default 6.0,    -- >= aprovado (0–10)
  nota_recuperacao_min numeric not null default 5.0, -- [min, aprovacao) = recuperação
  frequencia_minima_pct integer not null default 75, -- < reprova por frequência
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  constraint institution_settings_singleton check (id = true)
);

-- Linha default (idempotente).
insert into public.institution_settings (id) values (true)
on conflict (id) do nothing;

alter table public.institution_settings enable row level security;

-- Admin gerencia; professores podem ler (telas futuras).
drop policy if exists "admin gerencia settings" on public.institution_settings;
create policy "admin gerencia settings" on public.institution_settings
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "professor le settings" on public.institution_settings;
create policy "professor le settings" on public.institution_settings
  for select using (public.is_professor(auth.uid()));

-- Verificação
select
  exists (select 1 from pg_tables where tablename = 'institution_settings') as tabela_ok,
  (select count(*) from public.institution_settings) as linhas;

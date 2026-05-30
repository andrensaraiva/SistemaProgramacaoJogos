-- =============================================================================
-- Fase 6 - Cache simples de geracoes IA
-- =============================================================================
-- Idempotente. Pode rodar no SQL Editor depois da 0001.

create table if not exists public.ai_generation_cache (
  cache_key text primary key,
  kind text not null,
  prompt text not null,
  difficulty public.difficulty not null,
  payload jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.ai_generation_cache enable row level security;

drop policy if exists "professor le cache ia proprio" on public.ai_generation_cache;
create policy "professor le cache ia proprio" on public.ai_generation_cache
  for select using (
    created_by = auth.uid()
    or public.is_professor(auth.uid())
  );

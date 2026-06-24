-- =============================================================================
-- Loja de cosméticos + moedas Celeste
-- =============================================================================
-- O aluno ganha MOEDAS ao subir de nível e GASTA na loja, comprando os
-- cosméticos que quiser (em vez de desbloquear automático por nível).
--
-- Saldo é DERIVADO, não armazenado como total: evita hookar todas as fontes de
-- XP. Ganho por nível vem de uma função pura no código (coinsForLevel(level));
-- aqui guardamos só o que foi GASTO e BÔNUS avulsos (missões etc., no futuro):
--   saldo = coinsForLevel(level) + coins_bonus - coins_spent
--
-- Posse dos cosméticos em user_cosmetics. A compra é feita no servidor com
-- service role (valida preço/nível/saldo no código) — o aluno NÃO tem insert
-- direto, só leitura, pra não conseguir "se dar" itens de graça.
--
-- Aditiva, idempotente. Aplicar: npx supabase db push
-- =============================================================================

alter table public.profiles
  add column if not exists coins_spent integer not null default 0,
  add column if not exists coins_bonus integer not null default 0,
  add column if not exists avatar_skin_id text;

create table if not exists public.user_cosmetics (
  user_id uuid not null references public.profiles(id) on delete cascade,
  cosmetic_id text not null,
  kind text not null,
  acquired_at timestamptz not null default now(),
  primary key (user_id, cosmetic_id)
);
create index if not exists user_cosmetics_user_idx on public.user_cosmetics (user_id);

alter table public.user_cosmetics enable row level security;

-- O aluno lê os próprios cosméticos. Escrita (compra) é só via service role no
-- servidor, que valida saldo/nível — por isso não há policy de insert/update.
drop policy if exists "aluno le seus cosmeticos" on public.user_cosmetics;
create policy "aluno le seus cosmeticos" on public.user_cosmetics
  for select using (auth.uid() = user_id);

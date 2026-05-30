-- =============================================================================
-- Fase 6 — Linguagens dinâmicas
-- =============================================================================
-- Hoje a linguagem do exercício é um ENUM Postgres fixo (csharp/python/javascript).
-- Isso impede adicionar novas linguagens sem mexer no schema toda vez.
--
-- Esta migration é ADITIVA e IDEMPOTENTE: cria uma tabela `languages` referenciável
-- e uma coluna `language_id` em `exercises`. O ENUM `language` antigo continua
-- existindo por compatibilidade; a app passa a preferir `language_id` quando houver.
--
-- Pode rodar mais de uma vez sem efeito colateral.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Catálogo de linguagens
-- -----------------------------------------------------------------------------
-- `id` é um slug estável (ex: 'csharp', 'cpp', 'arduino'). NÃO é uuid de propósito:
-- facilita seed, leitura e referência no código.
create table if not exists public.languages (
  id text primary key,                       -- slug: 'csharp', 'python', 'cpp'...
  label text not null,                        -- nome exibido: 'C#', 'Python', 'C++'
  -- Execução via Piston:
  piston_runtime text,                        -- ex: 'csharp.net', 'python', 'gcc'
  piston_version text not null default '*',
  source_file text not null,                  -- nome do arquivo enviado: 'main.cs'
  -- Editor:
  monaco_language text not null,              -- modo do Monaco: 'csharp', 'cpp'...
  starter_code text not null default '',      -- template padrão quando o autor não fornece
  -- Capacidades / roteamento de execução:
  runner text not null default 'piston',      -- 'piston' | 'simulator' (ex: arduino) | 'none'
  is_enabled boolean not null default true,   -- aparece nos seletores?
  ord integer not null default 100,           -- ordem nos seletores
  created_at timestamptz not null default now()
);

alter table public.languages enable row level security;

-- Catálogo público de leitura; só admin escreve (via service role/seed).
drop policy if exists "todos leem linguagens" on public.languages;
create policy "todos leem linguagens" on public.languages
  for select using (true);

-- -----------------------------------------------------------------------------
-- 2. Seed das linguagens (as 3 atuais + novas que rodam direto no Piston)
-- -----------------------------------------------------------------------------
insert into public.languages
  (id, label, piston_runtime, piston_version, source_file, monaco_language, runner, ord, starter_code)
values
  ('csharp', 'C#', 'csharp.net', '*', 'main.cs', 'csharp', 'piston', 10,
   'using System;' || chr(10) || chr(10) || 'class Program' || chr(10) || '{' || chr(10) ||
   '    static void Main()' || chr(10) || '    {' || chr(10) ||
   '        // seu código aqui' || chr(10) || '    }' || chr(10) || '}' || chr(10)),
  ('python', 'Python', 'python', '*', 'main.py', 'python', 'piston', 20,
   '# seu código aqui' || chr(10)),
  ('javascript', 'JavaScript', 'javascript', '*', 'main.js', 'javascript', 'piston', 30,
   '// seu código aqui' || chr(10)),
  ('cpp', 'C++', 'c++', '*', 'main.cpp', 'cpp', 'piston', 40,
   '#include <iostream>' || chr(10) || 'using namespace std;' || chr(10) || chr(10) ||
   'int main() {' || chr(10) || '    // seu código aqui' || chr(10) ||
   '    return 0;' || chr(10) || '}' || chr(10)),
  ('java', 'Java', 'java', '*', 'Main.java', 'java', 'piston', 50,
   'public class Main {' || chr(10) || '    public static void main(String[] args) {' || chr(10) ||
   '        // seu código aqui' || chr(10) || '    }' || chr(10) || '}' || chr(10)),
  ('typescript', 'TypeScript', 'typescript', '*', 'main.ts', 'typescript', 'piston', 60,
   '// seu código aqui' || chr(10))
on conflict (id) do update set
  label = excluded.label,
  piston_runtime = excluded.piston_runtime,
  piston_version = excluded.piston_version,
  source_file = excluded.source_file,
  monaco_language = excluded.monaco_language,
  runner = excluded.runner,
  ord = excluded.ord;

-- Arduino: PLANEJADO, não implementado (ver docs/ARDUINO_PLANO.md).
-- Entra como linguagem desabilitada com runner 'simulator' para preparar o schema
-- sem ativar nada. Não aparece nos seletores enquanto is_enabled = false.
insert into public.languages
  (id, label, piston_runtime, piston_version, source_file, monaco_language, runner, is_enabled, ord, starter_code)
values
  ('arduino', 'Arduino (C++)', null, '*', 'sketch.ino', 'cpp', 'simulator', false, 200,
   '// Sketch Arduino — simulador em desenvolvimento' || chr(10) ||
   'void setup() {' || chr(10) || '  // roda uma vez' || chr(10) || '}' || chr(10) || chr(10) ||
   'void loop() {' || chr(10) || '  // roda em loop' || chr(10) || '}' || chr(10))
on conflict (id) do update set
  label = excluded.label,
  runner = excluded.runner,
  is_enabled = excluded.is_enabled,
  monaco_language = excluded.monaco_language;

-- -----------------------------------------------------------------------------
-- 3. Liga `exercises` ao catálogo
-- -----------------------------------------------------------------------------
alter table public.exercises
  add column if not exists language_id text references public.languages(id);

-- Backfill: copia o enum existente para o novo FK onde ainda estiver nulo.
update public.exercises
  set language_id = language::text
  where language_id is null;

create index if not exists exercises_language_id_idx on public.exercises (language_id);

-- -----------------------------------------------------------------------------
-- 4. Verificação final
-- -----------------------------------------------------------------------------
select
  (select count(*) from public.languages) as total_languages,
  (select count(*) from public.languages where is_enabled) as enabled_languages,
  (select count(*) from public.exercises where language_id is null) as exercises_sem_language_id;

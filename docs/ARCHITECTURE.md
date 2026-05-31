# Arquitetura

Visão geral de como o projeto funciona, para quem vai contribuir.

## Stack
- **Next.js 16** (App Router, Server Components + Server Actions) — ⚠️ versão com
  breaking changes; ver [web/AGENTS.md](../web/AGENTS.md) antes de usar API nova.
- **React 19**, **TypeScript 5**, **Tailwind CSS 4**.
- **Supabase** (Postgres + Auth + RLS). Sem ORM — queries via `@supabase/supabase-js`.
- **Monaco Editor** (editor de código), **Piston** self-hosted (executa o código).
- **Gemini** (`gemini-flash-latest`) para gerar exercício e importar PPC.
- **zod** para validação. Sem biblioteca de gráficos (SVG próprio em `components/ui/charts.tsx`).

## Fluxo de dados

```
Componente (server)  →  lê dados via createClient() (RLS do usuário logado)
Form (client)        →  Server Action ("use server")  →  createAdminClient() (service_role)
                                                          verifica posse no código
                                                          escreve no Postgres
Postgres             →  RLS + triggers (ex.: XP ao aprovar submissão de código)
```

- **`lib/supabase/server.ts`** (`createClient`): client com a sessão do usuário; respeita RLS. Use para **leitura** nas páginas.
- **`lib/supabase/admin.ts`** (`createAdminClient`): client `service_role` que **ignora RLS**; `import "server-only"`. Use em Server Actions para **escrever** árvores/relacionamentos, sempre **verificando posse no código** antes.
- **`lib/auth/dal.ts`**: `verifySession()`, `getProfile()`, `isProfessor()` (com `cache` do React).

## Papéis
`profiles.role` ∈ `aluno | professor | admin`. Hoje `professor` e `admin` têm os
mesmos poderes na UI (`isProfessor()` cobre ambos). Não há painel admin dedicado ainda.

## Modelo de dados (resumo)

**Turmas e currículo**
- `classes` (dono = `owner_id`) → `class_members` (alunos) → `class_groups` / `class_group_members` (grupos).
- `courses` → `course_modules` → `curricular_units` (+ `uc_capabilities`, `uc_knowledge`, `uc_bibliography`).
- `teaching_plans` (privado, clonável) → `teaching_plan_blocks`.
- `class_units` liga turma↔UC↔plano. `attendance_sessions` (aulas, com `period` = aula do dia) → `attendance_marks` (presente/atraso/falta).

**Exercícios e entregas**
- `exercises.exercise_type` ∈ `codigo | apresentacao | modelo_resposta`; `is_group`; `response_template`.
- `assignments` (listas da turma) ↔ `assignment_exercises` ↔ `exercises`.
- `submissions`: código (`code`, testado pelo Piston) **ou** entrega não-código
  (`submission_link`, `response_text`), com `group_id` para entrega de grupo.
  Status: `rodando|aprovado|reprovado|erro|entregue`. Nota manual em `manual_grade`/`manual_feedback`.

**Gamificação**: trigger `handle_approved_submission_rewards` dá XP/badges **só para
código aprovado** (guarda por `exercise_type`). Entregas não-código têm nota manual.

## RLS — padrão obrigatório (sem recursão)
Policies **nunca** consultam outra tabela com RLS diretamente — isso causa
recursão infinita (`stack depth limit exceeded`). Em vez disso, use as funções
`SECURITY DEFINER` (leem sem reavaliar RLS):
`is_professor`, `is_class_owner`, `is_class_member`, `is_group_member`, `teaches_student`, `owns_course`.

Exemplo:
```sql
create policy "aluno le grupos da sua turma" on public.class_groups
  for select using (public.is_class_member(class_id, auth.uid()));
```
Padrões: **leitura compartilhada p/ professores** (`is_professor`), **escrita só do
dono** (`owner_id = auth.uid()`), **escopo por turma** (`is_class_owner`/`is_class_member`).

## Migrations
- Banco novo do zero: rode `supabase/SETUP_COMPLETO.sql` no SQL Editor (reset + schema + seed base).
- Mudança incremental: crie `supabase/migrations/<timestamp>_nome.sql` e rode `npx supabase db push` (ver [SUPABASE_CLI.md](SUPABASE_CLI.md)). **Sempre reflita a mesma mudança no `SETUP_COMPLETO.sql`** para o reset continuar coerente.
- Dados demo: `cd web && npm run seed:demo:reset`.

## Estrutura de pastas (web/src)
- `app/(app)/<feature>/page.tsx` — server component; `_form.tsx`/`_grid.tsx`/`_editor.tsx`/`_manager.tsx` — client (`"use client"`).
- `app/(auth)/` — login/cadastro. `app/api/` — rotas (`/api/run`, `/api/ai/*`, `/api/health`).
- `lib/<modulo>/actions.ts` — server actions. `lib/<modulo>/types.ts` — tipos.
- `components/ui/` — kit visual (Card, PageHeader, StatCard, StatusBadge, Table, charts, Button, Input).

## Execução de código (Piston)
`/api/run` (teste rápido, não salva) e `submitSolution` (salva submissão) chamam
`lib/exercises/piston.ts` → container Docker em `localhost:2000`. Só linguagens com
`runner='piston'` na tabela `languages`. Ver [PROJETO_FUNCIONAMENTO.md](PROJETO_FUNCIONAMENTO.md).

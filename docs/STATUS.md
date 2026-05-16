# Status do projeto

> Snapshot vivo do estado da plataforma. Atualizado a cada mudança.
> **Última atualização:** 2026-05-16 — Fases 2 e 3 commitadas (merge das duas branches)
> **Repositório:** https://github.com/andrensaraiva/SistemaProgramacaoJogos

## Resumo executivo

| | |
|---|---|
| **Fases concluídas** | Fase 1 (auth) + Fase 2 (exercícios) + Fase 3 (turmas) |
| **Próxima fase** | **Fase 4** — gamificação (trigger XP automático, badges, ranking) |
| **Pendência** | nenhuma bloqueante. Setup completo, fluxo validado end-to-end. |
| **Pré-req novo** | Docker Desktop com container `piston_api` rodando (Piston público virou whitelist-only em 15/02/2026) |

---

## O que está pronto ✅

### Fase 0 — Fundação
- [x] Estrutura de pastas, [README](../README.md), [PLANO](PLANO.md), [SETUP](SETUP.md), [CONTINUAR](CONTINUAR.md)
- [x] `.gitignore` na raiz e git inicializado
- [x] Scaffolding **Next.js 16.2.6** + TypeScript + Tailwind 4 + App Router + Turbopack
- [x] Deps: `@supabase/supabase-js`, `@supabase/ssr`, `@monaco-editor/react`, `monaco-editor`, `zod`, `@google/generative-ai`

### Banco de dados
- [x] [supabase/migrations/0001_init.sql](../supabase/migrations/0001_init.sql) — 11 tabelas + RLS completo:
  - `profiles`, `classes`, `class_members`, `exercises`, `exercise_tests`
  - `assignments`, `assignment_exercises`, `submissions`
  - `badges`, `user_badges`, `duels`
  - Trigger que cria perfil automaticamente no cadastro
  - Seed: 5 badges padrão
- [x] [supabase/seed/0001_exercises.sql](../supabase/seed/0001_exercises.sql) — 3 exercícios C# públicos (Olá Mundo, Soma, FizzBuzz) com testes visíveis e ocultos. Idempotente.

### Fase 1 — Autenticação
- [x] Cliente Supabase browser e server (cookies async)
- [x] [web/src/lib/supabase/admin.ts](../web/src/lib/supabase/admin.ts) — cliente service_role (`import "server-only"`)
- [x] Proxy global com refresh de sessão e proteção de rotas
- [x] Server Actions: `login`, `signup`, `logout` (Zod + mensagens PT-BR)
- [x] DAL: `verifySession`, `getProfile`, `isProfessor` (React cache)
- [x] Páginas: `/entrar`, `/cadastrar` (com seletor aluno/professor)
- [x] Layout autenticado com header, nav e logout

### Fase 2 — Exercício rodando no navegador
- [x] [web/src/lib/exercises/types.ts](../web/src/lib/exercises/types.ts) — tipos `Exercise`, `SampleTest`, `RunResult`, `SubmissionResult`
- [x] [web/src/lib/exercises/judge.ts](../web/src/lib/exercises/judge.ts) — `compareOutputs` tolera `\r\n` e espaços no fim de linha
- [x] [web/src/lib/exercises/piston.ts](../web/src/lib/exercises/piston.ts) — cliente Piston (csharp.net, python, javascript)
- [x] [web/src/app/api/run/route.ts](../web/src/app/api/run/route.ts) — POST validado com Zod (botão "Testar")
- [x] [web/src/app/(app)/exercicios/page.tsx](../web/src/app/(app)/exercicios/page.tsx) — lista exercícios públicos
- [x] [web/src/app/(app)/exercicios/[id]/page.tsx](../web/src/app/(app)/exercicios/[id]/page.tsx) — server fetch
- [x] [web/src/app/(app)/exercicios/[id]/_workbench.tsx](../web/src/app/(app)/exercicios/[id]/_workbench.tsx) — client com Monaco lazy
- [x] [web/src/app/(app)/exercicios/[id]/actions.ts](../web/src/app/(app)/exercicios/[id]/actions.ts) — `submitSolution`: roda todos os testes, persiste, dá XP

### Fase 3 — Gestão de turmas
- [x] **CRUD de turmas (professor)**
  - [web/src/app/(app)/turmas/page.tsx](../web/src/app/(app)/turmas/page.tsx) — lista (professor: suas turmas; aluno: turmas inscritas)
  - [web/src/app/(app)/turmas/nova/](../web/src/app/(app)/turmas/nova/) — criar turma com código de convite automático
  - [web/src/app/(app)/turmas/[id]/editar/](../web/src/app/(app)/turmas/[id]/editar/) — editar nome e descrição
  - Excluir turma com confirmação (cascade: membros + listas)
- [x] **Convite por código**
  - [web/src/app/(app)/turmas/entrar/](../web/src/app/(app)/turmas/entrar/) — aluno entra com código de 8 chars
  - [web/src/app/(app)/turmas/[id]/](../web/src/app/(app)/turmas/[id]/) — exibe código + botão "Copiar" (professor)
  - Sair da turma com confirmação
- [x] **CRUD de listas**
  - [web/src/app/(app)/turmas/[id]/listas/nova/](../web/src/app/(app)/turmas/[id]/listas/nova/) — criar com tipo (lista/desafio/prova) e prazo
  - Excluir lista (submissões dos alunos são mantidas)
- [x] **Visão de progresso**
  - [web/src/app/(app)/turmas/[id]/listas/[lid]/page.tsx](../web/src/app/(app)/turmas/[id]/listas/[lid]/page.tsx)
  - Professor: tabela alunos × exercícios com ícones de status (✓/✗/—/…/!)
  - Aluno: resumo do próprio progresso com contagem de aprovados
- [x] [web/src/lib/turmas/actions.ts](../web/src/lib/turmas/actions.ts) — 7 server actions
- [x] [web/src/components/confirm-form.tsx](../web/src/components/confirm-form.tsx) — wrapper de confirmação client-side
- [x] `/painel` atualizado: turmas recentes linkadas, CTAs contextuais, contagem real de conquistas

### Componentes UI
- [x] `Button` (variantes: primary/secondary/ghost/danger)
- [x] `Input` + `Field` (com label e mensagem de erro)
- [x] `ConfirmForm` — wrapper de `confirm()` dialog
- [x] `CopyButton` — copia código de convite

### Validação
- [x] `tsc --noEmit` passa sem erros (Next 16 + React 19)

---

## Fluxo que já funciona end-to-end

**Como professor:**
1. Cadastrar como Professor → `/cadastrar`
2. Criar turma → `/turmas/nova`
3. Copiar código de convite → `/turmas/[id]`
4. Criar lista de exercícios → `/turmas/[id]/listas/nova`
5. Ver progresso dos alunos → `/turmas/[id]/listas/[lid]`

**Como aluno:**
1. Cadastrar como Aluno → `/cadastrar`
2. Entrar em turma com código → `/turmas/entrar`
3. Ver listas atribuídas → `/turmas/[id]`
4. Abrir um exercício → `/exercicios/[id]`
5. Editar no Monaco → **Testar** → **Enviar**
6. Submissão aprovada → +XP automaticamente no perfil
7. Ver progresso → `/turmas/[id]/listas/[lid]`

---

## Notas técnicas

- **Piston self-hosted:** Docker local (`piston_api`, port 2000, `--privileged --restart unless-stopped`, volume `piston_data`). Pacote `dotnet 5.0.201` (4 linguagens: csharp.net, fsharp.net, basic.net, fsi). `run_timeout` é 3000ms (limite do container). Comandos em [SETUP.md](SETUP.md) seção 4.
- **Pra deploy:** Vercel não roda Docker — vamos precisar hospedar o Piston em Fly.io, Railway, VPS, ou pedir whitelist no emkc. Decisão pra Fase 9.
- **XP / Level:** hoje calculado dentro do `submitSolution` (regra `level = floor(xp/100) + 1`). Na Fase 4 migra pra trigger no DB com peso por dificuldade.
- **Service role:** o cliente em `lib/supabase/admin.ts` tem `import "server-only"` pra falhar build se importado num client component.
- **Monaco:** carregado com `dynamic({ ssr: false })` (depende de `window`). Tema `vs-dark` fixo.
- **Tabela de progresso da Fase 3:** vai popular automaticamente conforme alunos enviam submissões da Fase 2 — já está integrada via `submissions.exercise_id` + `assignment_exercises`.

---

## Próximas fases

| Fase | Descrição | Status |
|---|---|---|
| **Fase 4** | Gamificação (XP por trigger, badges automáticos, ranking) | **próxima** |
| Fase 5 | Antifraude (paste detection, telemetria, similaridade) | — |
| Fase 6 | IA — gerar exercícios com Gemini | — |
| Fase 7 | X1 (duelos PvP via Supabase Realtime) | — |
| Fase 8 | Frente Unity (GitHub Classroom) | — |
| Fase 9 | Polimento, hospedagem do Piston em prod, deploy na Vercel | — |

Roteiro detalhado em [PLANO.md](PLANO.md).

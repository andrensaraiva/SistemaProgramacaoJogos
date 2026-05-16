# Status do projeto

> Snapshot vivo do estado da plataforma. Atualizado a cada mudança.
> **Última atualização:** 2026-05-16 — Fase 3 commitada
> **Repositório:** https://github.com/andrensaraiva/SistemaProgramacaoJogos

## Resumo executivo

| | |
|---|---|
| **Fases concluídas** | Fase 1 (auth) + Fase 3 (turmas) |
| **Próxima fase** | **Fase 2** — exercício com Monaco Editor + execução via Piston API |
| **Bloqueante** | Supabase configurado (`.env.local` com keys) — veja [CONTINUAR.md](CONTINUAR.md) |

---

## O que está pronto ✅

### Infraestrutura
- [x] Estrutura de pastas, README, PLANO, SETUP, STATUS, CONTINUAR
- [x] `.gitignore` na raiz
- [x] Scaffolding **Next.js 16.2.6** + TypeScript + Tailwind 4 + App Router + Turbopack
- [x] Deps: `@supabase/supabase-js`, `@supabase/ssr`, `@monaco-editor/react`, `monaco-editor`, `zod`, `@google/generative-ai`

### Banco de dados
- [x] [supabase/migrations/0001_init.sql](../supabase/migrations/0001_init.sql) — 11 tabelas + RLS completo:
  - `profiles`, `classes`, `class_members`, `exercises`, `exercise_tests`
  - `assignments`, `assignment_exercises`, `submissions`
  - `badges`, `user_badges`, `duels`
  - Trigger que cria perfil automaticamente no cadastro
  - Seed: 5 badges padrão

### Autenticação (Fase 1)
- [x] Cliente Supabase browser e server (cookies async)
- [x] Proxy global com refresh de sessão e proteção de rotas
- [x] Server Actions: `login`, `signup`, `logout` (Zod + mensagens PT-BR)
- [x] DAL: `verifySession`, `getProfile`, `isProfessor` (React cache)
- [x] Páginas: `/entrar`, `/cadastrar` (com seletor aluno/professor)
- [x] Layout autenticado com header, nav e logout

### Gestão de turmas (Fase 3)
- [x] **CRUD de turmas (professor)**
  - [web/src/app/(app)/turmas/page.tsx](../web/src/app/(app)/turmas/page.tsx) — lista (professor: suas turmas; aluno: turmas inscritas)
  - [web/src/app/(app)/turmas/nova/](../web/src/app/(app)/turmas/nova/) — criar turma com código de convite automático
  - [web/src/app/(app)/turmas/[id]/editar/](../web/src/app/(app)/turmas/[id]/editar/) — editar nome e descrição
  - Excluir turma com confirmação (cascade: membros + listas)
- [x] **Convite por código**
  - [web/src/app/(app)/turmas/entrar/](../web/src/app/(app)/turmas/entrar/) — aluno entra com código de 8 chars
  - [web/src/app/(app)/turmas/[id]/](../web/src/app/(app)/turmas/[id]/) — exibe código + botão "Copiar" (para professor)
  - Sair da turma com confirmação
- [x] **CRUD de listas de exercícios**
  - [web/src/app/(app)/turmas/[id]/listas/nova/](../web/src/app/(app)/turmas/[id]/listas/nova/) — criar lista com tipo (lista/desafio/prova) e prazo
  - Excluir lista (submissões dos alunos são mantidas)
- [x] **Visão de progresso**
  - [web/src/app/(app)/turmas/[id]/listas/[lid]/page.tsx](../web/src/app/(app)/turmas/[id]/listas/[lid]/page.tsx)
  - Professor: tabela alunos × exercícios com ícones de status (✓/✗/—/…/!)
  - Aluno: resumo do próprio progresso com contagem de aprovados
- [x] [web/src/lib/turmas/actions.ts](../web/src/lib/turmas/actions.ts) — 7 server actions: `criarTurma`, `editarTurma`, `excluirTurma`, `entrarNaTurma`, `sairDaTurma`, `criarLista`, `excluirLista`
- [x] [web/src/components/confirm-form.tsx](../web/src/components/confirm-form.tsx) — wrapper de confirmação client-side para ações destrutivas
- [x] `/painel` atualizado: turmas recentes linkadas, CTAs contextuais por papel, contagem de conquistas real

### Componentes UI
- [x] `Button` (`"use client"`, variantes: primary/secondary/ghost/danger)
- [x] `Input` + `Field` (`"use client"`, com label e mensagem de erro)
- [x] `ConfirmForm` — client wrapper para formulários com `confirm()` dialog
- [x] `CopyButton` — copia código de convite para a clipboard

---

## Fluxo que já funciona (com Supabase configurado)

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
4. Ver próprio progresso → `/turmas/[id]/listas/[lid]`

---

## Pendências do usuário 👋

Para o app rodar, o Supabase precisa estar configurado:

1. [ ] Criar projeto no Supabase (https://supabase.com/dashboard → New project)
2. [ ] Aplicar a migration: SQL Editor → colar `supabase/migrations/0001_init.sql` → Run
3. [ ] Copiar Project URL + anon key + service_role key para `web/.env.local`
4. [ ] Desabilitar confirmação de e-mail: Authentication → Sign In/Up → Email → desmarcar "Confirm email"

Passo a passo detalhado em [CONTINUAR.md](CONTINUAR.md).

---

## Próximas fases

| Fase | Descrição | Status |
|---|---|---|
| **Fase 2** | Exercício com Monaco Editor + Piston API | **próxima** |
| Fase 4 | Gamificação (XP automático, badges, ranking) | — |
| Fase 5 | Antifraude (paste detection, telemetria) | — |
| Fase 6 | IA — gerar exercícios com Gemini | — |
| Fase 7 | X1 (duelos PvP via Supabase Realtime) | — |
| Fase 8 | Frente Unity (GitHub Classroom) | — |
| Fase 9 | Polimento e deploy na Vercel | — |

Roteiro detalhado em [PLANO.md](PLANO.md).

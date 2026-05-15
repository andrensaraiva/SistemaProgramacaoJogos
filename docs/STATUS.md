# Status do projeto

> Snapshot vivo do estado da plataforma. Atualizado a cada mudança.
> **Última atualização:** 2026-05-15 — Fase 2 ✅ ponta a ponta (testada com Olá Mundo, +10 XP confirmado)
> **Repositório:** https://github.com/andrensaraiva/SistemaProgramacaoJogos

## Resumo executivo
- **Fase atual:** Fase 2 concluída e testada localmente (Monaco + Piston self-hosted + submissão com XP)
- **Próximo passo concreto:** commitar a Fase 2 e iniciar a Fase 3 (CRUD de turmas, invite code, atribuir listas a turmas)
- **Mudança importante:** A API pública do Piston (`emkc.org`) virou whitelist-only em **15/02/2026**. Agora usamos Piston **self-hosted via Docker**. Setup novo documentado em [SETUP.md](SETUP.md) seção 4.

## O que está pronto ✅

### Fase 0 — Fundação
- [x] Estrutura de pastas, [README](../README.md), [PLANO](PLANO.md), [SETUP](SETUP.md)
- [x] `.gitignore` na raiz e git inicializado
- [x] Scaffolding **Next.js 16.2.6** + TypeScript + Tailwind 4 + App Router + Turbopack em [web/](../web/)
- [x] Deps instaladas: `@supabase/supabase-js`, `@supabase/ssr`, `@monaco-editor/react`, `monaco-editor`, `zod`, `@google/generative-ai`

### Banco de dados
- [x] [supabase/migrations/0001_init.sql](../supabase/migrations/0001_init.sql) — esquema completo:
  - 11 tabelas: profiles, classes, class_members, exercises, exercise_tests, assignments, assignment_exercises, submissions, badges, user_badges, duels
  - RLS habilitado em todas com políticas por papel (aluno/professor)
  - Trigger que cria perfil automaticamente quando alguém se cadastra
  - Seed inicial de 5 badges (Primeira Vitória, Semana Consistente, Mão Própria, Duelista, Curioso)
- [x] [supabase/seed/0001_exercises.sql](../supabase/seed/0001_exercises.sql) — 3 exercícios C# públicos (Olá Mundo, Soma, FizzBuzz) com casos de teste visíveis e ocultos. Idempotente.

### Fase 1 — Autenticação
- [x] [web/src/lib/supabase/client.ts](../web/src/lib/supabase/client.ts) — cliente Supabase browser
- [x] [web/src/lib/supabase/server.ts](../web/src/lib/supabase/server.ts) — cliente Supabase server (cookies async)
- [x] [web/src/lib/supabase/middleware.ts](../web/src/lib/supabase/middleware.ts) — refresh de sessão e proteção de rotas
- [x] [web/src/lib/supabase/admin.ts](../web/src/lib/supabase/admin.ts) — cliente service_role (bypassa RLS, só server-side)
- [x] [web/proxy.ts](../web/proxy.ts) — proxy global do Next 16
- [x] [web/src/lib/auth/actions.ts](../web/src/lib/auth/actions.ts) — Server Actions: `login`, `signup`, `logout`
- [x] [web/src/lib/auth/dal.ts](../web/src/lib/auth/dal.ts) — Data Access Layer: `verifySession`, `getProfile`, `isProfessor` (cached)

### Fase 2 — Exercício rodando no navegador 🆕
- [x] [web/src/lib/exercises/types.ts](../web/src/lib/exercises/types.ts) — tipos `Exercise`, `SampleTest`, `RunResult`, `SubmissionResult`
- [x] [web/src/lib/exercises/judge.ts](../web/src/lib/exercises/judge.ts) — `compareOutputs` tolera `\r\n`, espaços no fim de linha e linhas em branco no fim
- [x] [web/src/lib/exercises/piston.ts](../web/src/lib/exercises/piston.ts) — cliente da Piston API (`csharp.net`, `python`, `javascript`)
- [x] [web/src/app/api/run/route.ts](../web/src/app/api/run/route.ts) — POST que valida com Zod e proxia pra Piston (botão "Testar")
- [x] [web/src/app/(app)/exercicios/page.tsx](../web/src/app/(app)/exercicios/page.tsx) — lista todos os `is_public=true`, agrupa por dificuldade
- [x] [web/src/app/(app)/exercicios/[id]/page.tsx](../web/src/app/(app)/exercicios/[id]/page.tsx) — server component que busca exercício + testes visíveis
- [x] [web/src/app/(app)/exercicios/[id]/_workbench.tsx](../web/src/app/(app)/exercicios/[id]/_workbench.tsx) — client com Monaco lazy (`dynamic({ssr:false})`), botões Testar/Enviar, painel de saída
- [x] [web/src/app/(app)/exercicios/[id]/actions.ts](../web/src/app/(app)/exercicios/[id]/actions.ts) — Server Action `submitSolution`: lê todos os testes (incl. ocultos via service_role) → roda no Piston em série → persiste em `submissions` → soma XP e recalcula nível se passou em todos

### Páginas e UI
- [x] [web/src/app/layout.tsx](../web/src/app/layout.tsx) — root em PT-BR com tema customizado
- [x] [web/src/app/globals.css](../web/src/app/globals.css) — paleta com tokens (primary roxo, success, danger, warning) + dark mode automático
- [x] [web/src/app/page.tsx](../web/src/app/page.tsx) — landing pública com hero + 4 features
- [x] [web/src/app/(auth)/](../web/src/app/(auth)/) — `/entrar` e `/cadastrar`
- [x] [web/src/app/(app)/painel/page.tsx](../web/src/app/(app)/painel/page.tsx) — dashboard com saudação, XP, nível
- [x] [web/src/app/(app)/exercicios/](../web/src/app/(app)/exercicios/) — fluxo completo de exercícios (lista → resolver → submeter)
- [x] Componentes UI: [Button](../web/src/components/ui/button.tsx), [Input/Field](../web/src/components/ui/input.tsx), [Logo](../web/src/components/logo.tsx)

### Validação
- [x] `tsc --noEmit` passa sem erros (Next 16 + React 19 + tipos do Supabase)

## Fluxo que já funciona end-to-end
1. Landing → cadastro → painel ✅
2. Painel → "Exercícios" no header → lista com 3 exercícios ✅
3. Clica em "Olá, Mundo!" → carrega Monaco com starter code ✅
4. **Testar** → manda pro `/api/run` → Piston compila/executa → mostra stdout/stderr ✅
5. **Enviar** → Server Action roda todos os casos (incl. ocultos) → marca aprovado/reprovado → adiciona XP no perfil → revalida `/painel` ✅

## Pendências do usuário 👋
Nenhuma bloqueante no momento. Todas as 5 tarefas iniciais (Supabase, migration, .env, Confirm email, teste) foram concluídas, e o fluxo de submissão foi validado.

## Notas técnicas
- **Piston self-hosted:** rodando em Docker local (`piston_api`, port 2000, `--privileged --restart unless-stopped`, volume `piston_data`). Pacote `dotnet 5.0.201` instalado (4 linguagens: csharp.net, fsharp.net, basic.net, fsi). `run_timeout` é 3000ms (limite do container). Comandos completos em [SETUP.md](SETUP.md) seção 4.
- **Pra deploy:** Vercel não roda Docker — vamos precisar hospedar o Piston em Fly.io, Railway, VPS, ou pedir whitelist no emkc. Decisão pra Fase 9.
- **XP / Level:** regra simples — `level = floor(xp / 100) + 1`. Pode evoluir na Fase 4 (trigger no DB).
- **Service role:** o cliente em `lib/supabase/admin.ts` usa `import "server-only"` pra falhar o build se for importado num client component.
- **Monaco:** carregado com `dynamic({ ssr: false })` porque depende de `window`. Tema `vs-dark` fixo por enquanto.

## Próximas fases
1. **Fase 3** — Gestão de turmas (próxima)
2. Fase 4 — Gamificação (badges automáticos, ranking)
3. Fase 5 — Antifraude (paste detection, similaridade)
4. Fase 6 — IA (Gemini gera exercícios)
5. Fase 7 — X1 (PvP via Realtime)
6. Fase 8 — Frente Unity (GitHub Classroom)
7. Fase 9 — Polimento e deploy

Roteiro detalhado em [PLANO.md](PLANO.md).

# Status do projeto

> Snapshot vivo do estado da plataforma. Atualizado a cada mudança.
> **Última atualização:** 2026-05-15 — Fase 1 commitada (commit `ca2c182`)
> **Repositório:** https://github.com/andrensaraiva/SistemaProgramacaoJogos

## Resumo executivo
- **Fase atual:** Fase 1 concluída (login funciona, falta só o Supabase estar configurado)
- **Próximo passo concreto:** **você** criar o projeto no Supabase, aplicar a migration e me passar as keys — passo a passo em [CONTINUAR.md](CONTINUAR.md)
- **Depois disso:** Fase 2 — página de exercício com Monaco Editor + execução de C# via Piston

> 📖 **Sessão pausada em 2026-05-15.** Pra retomar, leia [CONTINUAR.md](CONTINUAR.md).

## O que está pronto ✅

### Infraestrutura
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

### Autenticação
- [x] [web/src/lib/supabase/client.ts](../web/src/lib/supabase/client.ts) — cliente Supabase browser
- [x] [web/src/lib/supabase/server.ts](../web/src/lib/supabase/server.ts) — cliente Supabase server (cookies async)
- [x] [web/src/lib/supabase/middleware.ts](../web/src/lib/supabase/middleware.ts) — refresh de sessão e proteção de rotas
- [x] [web/proxy.ts](../web/proxy.ts) — proxy global do Next 16 (substituiu o middleware antigo)
- [x] [web/src/lib/auth/actions.ts](../web/src/lib/auth/actions.ts) — Server Actions: `login`, `signup`, `logout` (com Zod validation e mensagens em PT-BR)
- [x] [web/src/lib/auth/dal.ts](../web/src/lib/auth/dal.ts) — Data Access Layer: `verifySession`, `getProfile`, `isProfessor` (cached)

### Páginas e UI
- [x] [web/src/app/layout.tsx](../web/src/app/layout.tsx) — root em PT-BR com tema customizado
- [x] [web/src/app/globals.css](../web/src/app/globals.css) — paleta com tokens (primary roxo, success, danger, warning) + dark mode automático
- [x] [web/src/app/page.tsx](../web/src/app/page.tsx) — landing pública com hero + 4 features
- [x] [web/src/app/(auth)/](../web/src/app/(auth)/) — grupo de rotas de auth
  - `/entrar` — página de login (com `?proximo=` pra redirecionar de volta)
  - `/cadastrar` — página de cadastro com seletor aluno/professor
- [x] [web/src/app/(app)/](../web/src/app/(app)/) — grupo de rotas autenticadas
  - `/painel` — dashboard com saudação, XP, nível, conquistas (placeholder)
- [x] Componentes UI: [Button](../web/src/components/ui/button.tsx), [Input/Field](../web/src/components/ui/input.tsx), [Logo](../web/src/components/logo.tsx)

### Validação
- [x] `tsc --noEmit` passa sem erros — todos os tipos consistentes com Next 16

## Fluxo que já funciona (uma vez configurado o Supabase)
1. Usuário entra em `/` → vê a landing
2. Clica em "Criar conta" → vai pra `/cadastrar`, escolhe se é aluno ou professor, cria conta
3. É redirecionado pra `/painel` — protegido pelo proxy
4. Pode sair (botão Sair → Server Action que limpa a sessão)
5. Tentar acessar `/painel` deslogado → redireciona pra `/entrar?proximo=/painel`
6. Após login, volta pra `/painel`

## Pendências do usuário 👋
**Sem fazer essas, o login não vai funcionar:**

1. [ ] **Criar projeto no Supabase**
   - https://supabase.com/dashboard → New project
   - Nome sugerido: `sistema-jogos-programacao`
   - Região: South America (São Paulo)
   - Anote a senha do banco (não vamos usar agora, mas você precisa pra acessar o DB direto)

2. [ ] **Aplicar a migration**
   - SQL Editor → New query → cola [supabase/migrations/0001_init.sql](../supabase/migrations/0001_init.sql) → Run

3. [ ] **Pegar as keys**
   - Settings → API → copie:
     - Project URL
     - `anon public` key
     - `service_role` key

4. [ ] **Pegar API key do Gemini** (pra Fase 6 — pode deixar pra depois)
   - https://aistudio.google.com/app/apikey

5. [ ] **Me passar essas 4 strings** (URL + anon + service role + Gemini) — eu crio o `.env.local` e a gente sobe o servidor de dev

## Próximas fases
1. **Fase 2** — Exercício com Monaco + Piston (próxima)
2. Fase 3 — Gestão de turmas
3. Fase 4 — Gamificação (XP/badges/ranking)
4. Fase 5 — Antifraude
5. Fase 6 — IA (Gemini)
6. Fase 7 — X1 (PvP via Realtime)
7. Fase 8 — Frente Unity (GitHub Classroom)
8. Fase 9 — Polimento e deploy

Roteiro detalhado em [PLANO.md](PLANO.md).

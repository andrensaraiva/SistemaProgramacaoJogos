# Status do projeto

## Atualizacao 2026-06-01 (parte 2) — Projeto Integrador (TCC)

Projeto integrador (TCC do SENAI) como **atividade da UC** (kind=projeto_integrador),
que o professor inicia quando quiser (cedo ou no fim do curso).

Migration `0018_projeto_integrador.sql` (aditiva, aplicada):
- `projects` (1:1 com a atividade) -> `project_sprints` -> `project_tasks` (cards)
  por grupo, com `task_status` (a_fazer/fazendo/concluido), responsavel, sprint, ord.
- RLS: professor dono da UC gerencia tudo e ve todos os boards; membros do grupo
  (`is_group_member`) gerenciam os cards do proprio board.

App:
- `lib/projects/actions.ts`: criarOuObterProjeto, criar/excluirSprint,
  criar/mover/excluirCard (mover por botao, **sem drag** por ora).
- Pagina `.../ucs/[cu]/projetos/[assignmentId]`: setup (professor) + sprints +
  board estilo Trello por grupo (3 colunas). Aluno ve so o board do seu grupo.

**Pendente nesta feature:** drag-and-drop (hoje move por botao); tempo real
(Supabase Realtime) para edicao simultanea; entrega/nota do projeto.

## Atualizacao 2026-06-01

**Reorientacao do modelo: atividades dentro da UC (turma x UC)**. A plataforma
deixou de ser "Duolingo" (exercicios soltos, atribuicoes por turma) e passou a
ser orientada a CURSO -> UC -> TURMA. Toda atividade (lista, prova, desafio,
duelo, Unity, projeto integrador) agora vive num `class_unit`.

Branch: `refactor/atividades-na-uc` (ainda nao mergeada em `main`).

Migrations (aditivas, idempotentes, com backfill conservador — ja aplicadas):
- `0015_assignments_na_uc.sql`: `assignments.class_unit_id` +
  `teaching_plan_block_id`; novos `assignment_kind` (duelo/unity/projeto_integrador);
  helpers `owns_class_unit`/`member_of_class_unit`; RLS aceita os dois caminhos.
  Backfill: turma com UC unica usa ela; senao cria UC "Geral (migrado)".
- `0016_duelos_na_uc.sql`: `duels.class_unit_id` + tabela `duel_ratings` (ELO
  contextual por UC). `profiles.duel_rating/_wins/_losses` ficam por compat.
- `0017_unity_na_uc.sql`: `github_classroom_repos.class_unit_id` + `assignment_id`.

App:
- `criarAtividadeNaUc` (em `lib/turmas/actions.ts`) e hub em
  `turmas/[id]/ucs/[classUnitId]/atividades`.
- Duelos por UC: `createDuelNaUc`, `finishDuel/cancelDuel` gravam `duel_ratings`
  quando ha UC; pagina `.../ucs/[cu]/duelos` com ranking contextual.
- Unity por UC: `syncGithubRepo` aceita `class_unit_id`; pagina `.../ucs/[cu]/unity`.
- Links Atividades/Duelos/Unity na lista de UCs da turma.

**Fase 2 pendente** (apos UI 100% migrada e dados conferidos): tornar
`class_unit_id` NOT NULL e remover `class_id` de assignments/duels/repos; mover ou
aposentar as rotas globais `/duelos` e `/unity`; reclassificar atividades que
cairam na UC "Geral (migrado)".

**Proximo na fila do usuario**: SAEP (provas praticas+objetivas por curso) e
projeto integrador — viram novos tipos de atividade da UC.

## Atualizacao 2026-05-31

Ponto de partida para a proxima sessao (analise de projeto). Tudo abaixo esta
commitado em `main` (sincronizado com origin) e verificado com `npm run verify`.

**Camada curricular (Fase 8)** — completa:
- PPC -> modulos -> UCs (habilidades, conhecimentos em arvore, bibliografia);
  importacao de PPC por IA (Gemini) extraindo so a parte tecnica.
- Plano de ensino por professor (clonavel por colegas) com blocos de aulas.
- Vinculo turma<->UC<->plano; **frequencia por aula do dia** (varios tempos/dia,
  presente/atraso/falta); visao de frequencia do aluno.

**Plataforma completa (este ciclo)**:
- **Tipos de exercicio**: codigo (Piston), apresentacao (entrega de link) e
  modelo de resposta (texto). Criacao manual em `/exercicios/novo`.
- **Grupos** por turma e entrega em grupo (nota vale para todos os membros).
- **Notas do aluno** por turma (`/turmas/[id]/minhas-notas`).
- **Dashboard do professor por UC** (frequencia, atrasos, notas, entregas, com
  graficos) + **relatorio PDF** via impressao do navegador.

**UI/UX redesenhada**:
- Sidebar lateral (estilo Canvas), tema claro/escuro com botao (persistido,
  anti-flash), identidade gamificada (XP/gradientes/glow).
- Kit de UI em `components/ui/`: Card, PageHeader, StatCard, StatusBadge, Badge,
  Table, charts (SVG), EmptyState/ErrorState. XpBar e AppSidebar em `components/`.

**Infra/processo**:
- Supabase CLI configurada: migrations em `supabase/migrations/<timestamp>_nome.sql`
  aplicadas com `npx supabase db push` (refletir tambem no `SETUP_COMPLETO.sql`).
- Correcao critica de **recursao de RLS**: funcoes `SECURITY DEFINER`
  (is_professor, is_class_owner, is_class_member, is_group_member, teaches_student,
  owns_course) — policies nunca consultam outra tabela com RLS direto.
- Modelo Gemini padrao: `gemini-flash-latest` (os `gemini-1.5-*` foram aposentados).

**Docs para contribuidores**: `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`,
`docs/ROADMAP.md` (backlog por papel aluno/professor/admin), `docs/UI_UX.md`,
`docs/SUPABASE_CLI.md`.

**Proximos passos candidatos** (decidir na analise): deploy (hospedar Piston +
Vercel), refinos de UI/UX (toasts, skeletons, acessibilidade), aprofundar
funcionalidades (editor de testes pela UI, rubricas, painel admin, notificacoes),
ou qualidade (testes automatizados + CI). Detalhes em `docs/ROADMAP.md`.

## Atualizacao 2026-05-20

Fase 5 iniciada:

- O Workbench captura evento de paste, contagem de mudancas no editor e tempo entre primeira edicao e submissao.
- `submitSolution` persiste `paste_event_count`, `keystroke_count`, `time_to_solve_ms`, `suspicion_score` e `suspicion_reasons` em `submissions`.
- A pontuacao inicial marca sinais como `paste_detected`, `very_fast_submission` e `low_edit_count`.
- A tela de progresso da lista mostra alertas antifraude para o professor, incluindo score, motivos e indicador por exercicio.
- A mesma tela compara as submissões mais recentes da turma e sinaliza codigos com similaridade alta.

Dev server:

- `npm run dev` usa Webpack e `127.0.0.1` por padrao para reduzir uso de memoria no Windows.
- `npm run dev:turbo` mantem Turbopack disponivel como opcional.

Fase 6 iniciada:

- Professores podem acessar `/exercicios/gerar` para criar exercicios C# com Gemini.
- A geracao salva enunciado, codigo inicial, solucao interna e testes visiveis/ocultos no Supabase.
- Alunos podem gerar um exercicio extra similar a partir da tela de qualquer exercicio.
- `supabase/migrations/0003_ai_cache.sql` adiciona cache opcional para reduzir chamadas repetidas ao Gemini.
- Configure `GEMINI_API_KEY` e, opcionalmente, `GEMINI_MODEL` no `.env.local`.

Fase 7 iniciada:

- `/duelos` permite criar duelo, entrar por codigo, abrir o exercicio e atualizar o vencedor.
- O vencedor e calculado pela primeira submissao aprovada apos o inicio do duelo.
- Duelos concluidos atualizam ELO, vitorias, derrotas e exibem o delta na tela.

Fase 8 iniciada:

- Templates adicionados em `classroom-templates/csharp-basico` e `classroom-templates/unity-projeto`.
- `/unity` documenta o fluxo GitHub Classroom dentro da plataforma.
- `/unity/github` consulta a GitHub API, salva repositorios acompanhados e mostra nota estimada por GitHub Actions.

Fase 9 iniciada:

- Tour guiado de primeiro acesso do aluno aparece no `/painel` uma vez por navegador.

Fase 4 iniciada:

- `supabase/migrations/0002_gamification.sql` adiciona `xp_awarded`, trigger de recompensas, multiplicador por dificuldade e badges automaticos.
- `submitSolution` nao atualiza mais `profiles.xp` manualmente; agora persiste a submissao e usa `xp_awarded` retornado pelo banco.
- XP e concedido apenas na primeira aprovacao do exercicio por aluno, evitando farm por reenvio.
- Badges automaticos implementados: `first_green`, `no_paste` e `streak_7`.
- Ranking global disponivel em `/ranking`.
- Ranking de turma disponivel em `/turmas/[id]/ranking`.
- A tela de submissao exibe uma notificacao quando uma nova badge e desbloqueada.

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

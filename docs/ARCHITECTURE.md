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
`profiles.role` ∈ `aluno | professor | coordenador | admin` (Celeste Academy —
plataforma institucional, **sem cadastro aberto**). A navegação por papel é
isolada em [`lib/features.ts`](../web/src/lib/features.ts) (`getNavGroups(role)`);
o middleware bloqueia acesso direto fora do escopo de cada papel.
- **aluno**: experiência gamificada (exercícios, duelos, ranking, perfil/loja).
- **professor**: cria turmas/alunos, atividades, avalia; pode ser co-docente.
- **coordenador**: gestão de qualquer turma + salas + relatórios (podado da área
  de aluno).
- **admin**: painel dedicado (`/admin`) — cria professores, configurações da
  instituição, stats, relatórios, feriados. `is_master_admin` é o super-admin.

## Governança institucional
- **Identidades hierárquicas** (migration 0024): admin cria professor; professor
  cria aluno. Aluno tem 2 e-mails (pessoal + institucional, ambos logam). 1º
  acesso força trocar senha + completar perfil. Esqueci-senha por aprovação
  (professor/admin gera senha temporária). Notificações in-app (`notifications`).
- **Co-docência** (0031): vários professores por turma (`class_teachers`) +
  feedback anônimo dos alunos. Helpers `is_class_teacher`, `is_uc_responsible`.
- **Salas e calendário** (0033/0035): ambientes/ocupação e cronograma do curso
  por turma. **Feriados** e **configurações da instituição** (0026/0032).

## Modelo de dados (resumo)

**Turmas e currículo**
- `classes` (dono = `owner_id`) → `class_members` (alunos) → `class_groups` / `class_group_members` (grupos).
- `courses` → `course_modules` → `curricular_units` (+ `uc_capabilities`, `uc_knowledge`, `uc_bibliography`).
- `teaching_plans` (privado, clonável) → `teaching_plan_blocks`.
- `class_units` liga turma↔UC↔plano. `attendance_sessions` (aulas, com `period` = aula do dia) → `attendance_marks` (presente/atraso/falta).

**Atividades dentro da UC** (modelo CURSO → UC → TURMA)
- Toda atividade é uma `assignment` ligada a um `class_unit` (turma × UC) via
  `assignments.class_unit_id` — não mais solta por turma. `assignment_kind` ∈
  `lista | desafio | prova | duelo | unity | projeto_integrador | saep_simulado |
  sap_pratico`.
- `class_id` ainda existe nas tabelas por compat (Fase 2 remove). Hub de atividades
  em `turmas/[id]/ucs/[classUnitId]/atividades`.

**Exercícios e entregas**
- `exercises` é **banco reutilizável** (do autor, clonável); só a atribuição vincula à UC.
- `exercises.exercise_type` ∈ `codigo | apresentacao | modelo_resposta` + criativos
  (`pixel_art | vetor | arte_digital | blocos`); `is_group`; `response_template`.
  Governados pelo registry central [`lib/activities/registry.ts`](../web/src/lib/activities/registry.ts)
  (nenhuma tela compara o tipo por string — ver seção **Modularidade** abaixo).
- `assignments` ↔ `assignment_exercises` ↔ `exercises`.
- `submissions`: código (`code`, testado pelo Piston) **ou** entrega não-código
  (`submission_link`, `response_text`), com `group_id` para entrega de grupo.
  Status: `rodando|aprovado|reprovado|erro|entregue`. Nota manual em `manual_grade`/`manual_feedback`.

**Duelos** (`duels.class_unit_id`) e **Unity** (`github_classroom_repos.class_unit_id`)
acontecem dentro da UC. ELO de duelo é **contextual** por UC (`duel_ratings`), não global.

**Projeto integrador (TCC)**: `projects` (1:1 com a atividade `projeto_integrador`)
→ `project_sprints` → `project_tasks` (board estilo Trello por grupo, `class_groups`).

**SAEP (prova teórica)**: matriz **por curso** (`competency_matrices` →
`competencies` C1-C8 + `knowledge_objects` A-T). Banco `quiz_questions` +
`quiz_options` (A-E, correta, justificativa). Simulado = atividade `saep_simulado`
(`quiz_simulados` + `quiz_simulado_questions`); `quiz_attempts`/`quiz_answers` com
correção automática. Geração de questão por IA em `lib/saep/ai.ts` (instrutor revisa).

**Gamificação**: trigger `handle_approved_submission_rewards` dá XP/badges para
código aprovado; além disso há **XP por entrega** e **nota→XP** (nota do professor
vira XP) e XP por acerto no SAEP. **Cosméticos**: perfil estilo Discord com
avatar/banner/molduras compráveis com **moedas Celeste** (derivadas do nível) —
tabela `user_cosmetics`, registry [`lib/cosmetics/registry.ts`](../web/src/lib/cosmetics/registry.ts).
Streak diário em `profiles`. Ver [ALUNO_DISCORD.md](ALUNO_DISCORD.md).

## RLS — padrão obrigatório (sem recursão)
Policies **nunca** consultam outra tabela com RLS diretamente — isso causa
recursão infinita (`stack depth limit exceeded`). Em vez disso, use as funções
`SECURITY DEFINER` (leem sem reavaliar RLS):
`is_professor`, `is_class_owner`, `is_class_member`, `is_group_member`,
`teaches_student`, `owns_course`, `owns_class_unit`, `member_of_class_unit`,
`is_class_teacher`, `is_uc_responsible` (co-docência), `is_admin`,
`is_master_admin`, `is_coordenador`.

Exemplo:
```sql
create policy "aluno le grupos da sua turma" on public.class_groups
  for select using (public.is_class_member(class_id, auth.uid()));
```
Padrões: **leitura compartilhada p/ professores** (`is_professor`), **escrita só do
dono** (`owner_id = auth.uid()`), **escopo por turma** (`is_class_owner`/`is_class_member`).

## Migrations
- Banco novo do zero: rode `supabase/SETUP_COMPLETO.sql` no SQL Editor (reset + schema + seed base).
- Mudança incremental: crie `supabase/migrations/<timestamp>_nome.sql` e rode `npx supabase db push` (setup da CLI em [SETUP.md](SETUP.md)). **Sempre reflita a mesma mudança no `SETUP_COMPLETO.sql`** para o reset continuar coerente.
- Dados demo: `cd web && npm run seed:demo:reset`.

## Estrutura de pastas (web/src)
- `app/(app)/<feature>/page.tsx` — server component; `_form.tsx`/`_grid.tsx`/`_editor.tsx`/`_manager.tsx` — client (`"use client"`).
- `app/(auth)/` — login/cadastro. `app/api/` — rotas (`/api/run`, `/api/ai/*`, `/api/health`).
- `lib/<modulo>/actions.ts` — server actions. `lib/<modulo>/types.ts` — tipos.
- `components/ui/` — kit visual (Card, PageHeader, StatCard, StatusBadge, Table, charts, Button, Input).

## Execução de código (Piston)
`/api/run` (teste rápido, não salva) e `submitSolution` (salva submissão) chamam
`lib/exercises/piston.ts` → container Docker em `localhost:2000`. Só linguagens com
`runner='piston'` na tabela `languages`. Exercícios criativos (`pixel_art`, `vetor`,
`arte_digital`, `blocos`) não usam Piston — têm editor embutido e correção manual.

---

# Modularidade — features como blocos

O projeto é organizado por **features (domínios)** com baixo acoplamento: cada
funcionalidade é um bloco que pode ser desenvolvido, testado, corrigido e
removido com impacto mínimo nos outros.

## Princípio central

> **Uma feature não importa outra feature.** Features só dependem de duas
> fundações compartilhadas: `auth` (quem é o usuário) e `supabase` (acesso ao
> banco), além do kit de UI (`components/ui/`) e do registro de features
> (`lib/features.ts`).

Se você se pegar escrevendo `import ... from "@/lib/<outra-feature>"` dentro de
uma feature, pare: ou o que você quer é fundação compartilhada (extraia para um
lugar comum) ou as features estão se acoplando (repense).

## Anatomia de uma feature

| Camada | Onde fica | Papel |
|---|---|---|
| **Lógica/dados** | `web/src/lib/<feature>/` | Server Actions, agregadores, regras puras. |
| **Banco** | `supabase/migrations/<timestamp>_<feature>.sql` | Tabelas, enums, RLS — **aditivo e idempotente**. |
| **Rotas/telas** | `web/src/app/(app)/.../<feature>/` | Páginas (server) + componentes client (`_*.tsx`). |
| **Navegação** | `web/src/lib/features.ts` | Entrada no menu lateral (liga/desliga num lugar só). |

Regras de RLS usam sempre os helpers `SECURITY DEFINER` (ver seção **RLS** acima) —
nunca consultam outra tabela com RLS direto.

## Como ADICIONAR uma feature

1. **Migration** aditiva e idempotente (`create table if not exists`,
   `drop policy if exists` antes de `create policy`). Reusar helpers de RLS.
   Aplicar com `npx supabase db push`.
2. **Lógica** em `lib/<feature>/` — Server Actions que verificam posse no código
   antes de escrever. Extrair **regras puras** (cálculo, correção, agregação) em
   funções testáveis.
3. **Telas** em `app/(app)/.../<feature>/`.
4. **Navegação**: adicionar a feature em `lib/features.ts` (se tiver item no menu).
5. **Testes** das regras puras em `lib/<feature>/*.test.ts`.
6. **Docs**: uma linha no histórico do [CONTINUAR.md](CONTINUAR.md).

## Como REMOVER uma feature

1. `lib/features.ts`: `enabled: false` (some do menu) ou remova a entrada.
2. Apague `lib/<feature>/` e as rotas `app/(app)/.../<feature>/`.
3. Procure **links cruzados** de outras telas (`grep -rn "<feature>"`) — atalhos
   contextuais (ex.: botões na lista de UCs) são o principal ponto de costura manual.
4. Banco: migration com `drop table ...` (opcional — pode-se deixar os dados).

## Como adicionar um TIPO DE ATIVIDADE (`exercise_type`)

Cada exercício tem um **tipo** (`codigo`, `apresentacao`, `modelo_resposta`,
`pixel_art`, `vetor`, `arte_digital`, `blocos`) governado por um **registro
central**: [`lib/activities/registry.ts`](../web/src/lib/activities/registry.ts).

> **Regra:** nenhuma tela compara `exercise_type` por string. Elas leem o
> registro: `activityFamily()`, `isCodeKind()`, `isCreativeKind()`,
> `isDeliveryKind()`, `activityMeta().deliveryInput`, etc.

| Família | Tipos | Entrega | Correção |
|---|---|---|---|
| `code` | `codigo` | editor Monaco (página dedicada) | testes automáticos + XP |
| `creative` | `pixel_art`, `vetor`, `arte_digital`, `blocos` | editor embutido (canvas/blocos) | manual |
| `delivery` | `apresentacao`, `modelo_resposta` | link ou texto inline | manual |

Para **adicionar um tipo**: (1) `alter type public.exercise_type add value if not
exists '<novo>'` numa migration; (2) entrada em `ACTIVITY_TYPES` (ou item em
`lib/canvas/tools.ts`, se criativo) definindo `family`/`autoXp`/`autoGraded`/
`dedicatedPage`/`deliveryInput`; (3) UI de entrega só se a família não cobrir. O
invariante de famílias é coberto por `lib/activities/registry.test.ts`.

## Pontos de junção (acoplamento aceito de propósito)

O "tronco" do modelo CURSO → UC → TURMA. Mexer aqui afeta várias features:

- **`assignments` + enum `assignment_kind`** — toda atividade da UC é uma
  `assignment` com um `kind`. Nova feature de atividade = novo `kind` + roteio no
  hub (`turmas/[id]/ucs/[classUnitId]/atividades`).
- **`class_units`** (turma × UC) — o contêiner de tudo (features penduram via
  `class_unit_id`).
- **`class_groups`** — grupos de alunos, reusados pelo projeto integrador.
- **`duel_ratings`** — ranking de ELO por UC, reusado por duelos de código e quiz.
- **`profiles.xp` / `level`** — gamificação compartilhada (moedas derivam do nível).

## O que ainda NÃO é modular (honesto)

- **Sem hot-plug real**: remover feature ainda exige editar arquivos e limpar
  links cruzados. `lib/features.ts` resolve o menu, não os atalhos contextuais.
- **Tronco compartilhado**: features de atividade dependem de `assignment_kind` e
  `class_units` — coerência intencional, não independência total.
- **Testes cobrem regras puras**, não fluxo ponta-a-ponta (não há e2e ainda).

## Mapa de features

Migrations `0001` → `0046`. `lib/` fica em `web/src/lib/`.

| Feature | `lib/` | Migration(s) | Rotas principais |
|---|---|---|---|
| Exercícios | `exercises`, `submissions`, `grading`, `assignments` | 0001, 0012 | `/exercicios`, `/turmas/.../listas` |
| Tipos de atividade (registry) | `activities`, `canvas`, `blocks` | 0027-0030 | usado por exercícios (criativos/blocos) |
| Turmas/Currículo | `turmas`, `curriculum`, `attendance` | 0001, 0007, 0011 | `/turmas`, `/cursos`, `/planos` |
| Grupos | `groups` | 0013, 0014 | `/turmas/[id]/grupos` |
| Atividades na UC | (em `turmas`, `assignments`) | 0015, 0016, 0017 | `/turmas/.../ucs/.../atividades` |
| Duelos (código) | `duelos` (em `app`) | 0004, 0016 | `/turmas/.../ucs/.../duelos` |
| Unity | (em `app/unity`) | 0017 | `/turmas/.../ucs/.../unity` |
| Projeto integrador | `projects` | 0018, 0043 | `/turmas/.../ucs/.../projetos` |
| SAEP (teórico) | `saep` | 0019, 0020 | `/saep/questoes`, `/turmas/.../ucs/.../simulados`, `.../saep`, `.../duelos-quiz` |
| SAP (prático) | `sap` | 0021, 0022 | `/turmas/.../ucs/.../sap/[assignmentId]` |
| Modo prova (lockdown) | `exams` | 0045 | `/turmas/.../ucs/.../` (prova) |
| Dashboard UC | `dashboard` | — | `/turmas/.../ucs/.../dashboard` |
| IA | `ai` | 0003 | usada por exercícios e SAEP |
| Identidades | `identidades`, `notifications`, `alunos` | 0024 | `/entrar`, `/primeiro-acesso`, `/esqueci-senha`, `/turmas/[id]/alunos` |
| Admin / Governança | `admin`, `reports` | 0025, 0026, 0032 | `/admin`, `/admin/relatorios`, `/admin/feriados`, `/admin/configuracoes` |
| Coordenação / Salas | `rooms`, `calendar` | 0033, 0034, 0035, 0036 | `/coordenador`, `/salas`, `/salas/ocupacao`, `/turmas/[id]/calendario` |
| Co-docência / Feedback | `feedback` (em `turmas`) | 0031, 0037 | `/turmas/[id]` (professores + feedback anônimo) |
| Perfil / Cosméticos | `cosmetics`, `gamification` | 0040, 0041, 0042 | `/perfil`, `/desempenho`, `/ranking` |

---

# UI/UX

Diretrizes para manter a interface consistente e agradável.

## Princípios
- **Clareza antes de enfeite**: professor e aluno acham rápido o que importa
  (notas, frequência, próxima entrega).
- **Consistência**: mesmos componentes, espaçamentos e cores em todas as telas.
- **PT-BR** em tudo. Mensagens de erro úteis e específicas.
- **Imprimível**: relatórios funcionam no `window.print()` (PDF) sem quebrar.
- **Gamificado**: XP/nível e conquistas em destaque; cores vibrantes com brilho
  sutil onde faz sentido.

## Tema (claro/escuro)
- Tokens em `web/src/app/globals.css`. Dark é controlado pela **classe `.dark`** no
  `<html>` (não por `@media`). Um script anti-flash no `app/layout.tsx` aplica o
  tema salvo antes da hidratação; o `ThemeToggle` (rodapé da sidebar) alterna e
  persiste em `localStorage`.
- Cores: `primary` (roxo), `accent` (ciano), `success`, `warning`, `danger`,
  `xp`/`xp-2` (dourado→rosa), além de `background`/`card`/`muted`/`border`/`ring`.
  **Use sempre os tokens** (`text-primary`, `bg-card`...), nunca cores fixas.
- Utilitários: `.glow-primary`, `.glow-xp`, `.text-gradient`, `.xp-fill`.

## Navegação
- **Sidebar lateral** fixa (`components/app-sidebar.tsx`), agrupada por papel em
  "Aprender", "Turmas", "Coordenação" e "Administração" (fonte única em
  `lib/features.ts`), com item ativo destacado. No mobile vira drawer.
- Rodapé da sidebar: perfil, **barra de XP** (`components/xp-bar.tsx`, aluno),
  `ThemeToggle` e Sair.

## Kit de componentes (`web/src/components/ui/`)
- **Card / CardHeader**, **PageHeader** (título + descrição + ações),
  **StatCard** (KPI com `tone`), **StatusBadge** (status do domínio),
  **Badge** (rótulo genérico), **Table** e derivados, **EmptyState/ErrorState**
  (`ui/states.tsx`), **charts** (`ProgressBar`, `BarChart`, `Donut` — SVG que
  imprime bem), **Button** (`primary|secondary|ghost|danger`), **Input/Field**.

Regra: ao criar uma tela, monte com esses componentes. Faltou algo? Adicione ao
kit (não crie estilo solto na página).

## Padrões de layout
- Página: `flex flex-col gap-6`, começando por `Breadcrumbs` (quando há
  hierarquia) e `PageHeader`.
- Grids de cartões: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3/4`.
- Cartão clicável: `<Link className="group"><Card className="group-hover:border-primary/50">`.
- Ações destrutivas: `ConfirmForm` + `Button variant="danger"`.

## Refinos ainda possíveis (backlog de UI)
- Substituir `alert()` por toasts (já há toast de recompensa no aluno).
- Estados de carregamento (skeletons) nas listas.
- Revisar acessibilidade (foco visível, navegação por teclado) e densidade no mobile.

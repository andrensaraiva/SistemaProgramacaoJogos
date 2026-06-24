# Arquitetura modular — como features são blocos

Este projeto é organizado por **features (domínios)** com baixo acoplamento: cada
funcionalidade é um bloco que pode ser desenvolvido, testado, corrigido e
removido com impacto mínimo nos outros. Este documento descreve o padrão para
manter essa disciplina ao adicionar ou remover features.

## Princípio central

> **Uma feature não importa outra feature.** Features só dependem de duas
> fundações compartilhadas: `auth` (quem é o usuário) e `supabase` (acesso ao
> banco), além do kit de UI (`components/ui/`) e do registro de features
> (`lib/features.ts`).

Se você se pegar escrevendo `import ... from "@/lib/<outra-feature>"` dentro de
uma feature, pare: ou o que você quer é fundação compartilhada (extraia para um
lugar comum) ou as features estão se acoplando (repense).

## Anatomia de uma feature

Uma feature (ex.: `saep`, `projects`, `duelos`) tem até quatro superfícies:

| Camada | Onde fica | Papel |
|---|---|---|
| **Lógica/dados** | `web/src/lib/<feature>/` | Server Actions, agregadores, regras puras. |
| **Banco** | `supabase/migrations/<timestamp>_<feature>.sql` | Tabelas, enums, RLS — **aditivo e idempotente**. |
| **Rotas/telas** | `web/src/app/(app)/.../<feature>/` | Páginas (server) + componentes client (`_*.tsx`). |
| **Navegação** | `web/src/lib/features.ts` | Entrada no menu lateral (liga/desliga num lugar só). |

Regras de RLS usam sempre os helpers `SECURITY DEFINER` (ver
[ARCHITECTURE.md](ARCHITECTURE.md)) — nunca consultam outra tabela com RLS direto.

## Como ADICIONAR uma feature

1. **Migration** `supabase/migrations/<timestamp>_<feature>.sql` — aditiva e
   idempotente (`create table if not exists`, `drop policy if exists` antes de
   `create policy`). Reusar helpers de RLS existentes.
   Aplicar com `npx supabase db push`.
2. **Lógica** em `web/src/lib/<feature>/` — Server Actions (`"use server"`) que
   verificam posse no código antes de escrever (padrão `createAdminClient`).
   Extrair **regras puras** (cálculo, correção, agregação) em funções testáveis.
3. **Telas** em `web/src/app/(app)/.../<feature>/`.
4. **Navegação**: adicionar a feature em `lib/features.ts` (se tiver entrada no
   menu lateral).
5. **Testes** das regras puras em `web/src/lib/<feature>/*.test.ts`.
6. **Docs**: uma linha em [STATUS.md](STATUS.md) e, se for grande, uma memória.

## Como REMOVER uma feature

1. `lib/features.ts`: marque `enabled: false` (some do menu imediatamente) ou
   remova a entrada.
2. Apague a pasta `web/src/lib/<feature>/` e as rotas
   `web/src/app/(app)/.../<feature>/`.
3. Procure **links cruzados** que outras telas tenham para a feature
   (`grep -rn "<feature>"`). Ex.: botões de atalho na lista de UCs ou em páginas
   de outras features. Hoje esses links são o principal "ponto de costura"
   manual — ver abaixo.
4. Banco: crie uma migration que faz `drop table ...` das tabelas da feature
   (opcional — pode-se deixar os dados; o app deixa de referenciá-los).

## Como adicionar um TIPO DE ATIVIDADE (`exercise_type`)

Dentro de uma lista, cada exercício tem um **tipo** (`exercise_type`): `codigo`,
`apresentacao`, `modelo_resposta` ou um tipo criativo (`pixel_art`, `vetor`,
`arte_digital`, `blocos`). Esses tipos são governados por um **registro central**:
[`lib/activities/registry.ts`](../web/src/lib/activities/registry.ts).

> **Regra:** nenhuma tela compara `exercise_type` por string (`=== "codigo"`,
> `includes([...])`). Elas leem o registro: `activityFamily()`, `isCodeKind()`,
> `isCreativeKind()`, `isDeliveryKind()`, `activityMeta().deliveryInput`, etc.

Cada tipo pertence a uma **família** de comportamento:

| Família | Tipos | Entrega | Correção |
|---|---|---|---|
| `code` | `codigo` | editor Monaco (página dedicada) | testes automáticos + XP |
| `creative` | `pixel_art`, `vetor`, `arte_digital`, `blocos` | editor embutido (canvas/blocos) | manual |
| `delivery` | `apresentacao`, `modelo_resposta` | link ou texto inline | manual |

Para **adicionar um tipo**:

1. **Banco**: `alter type public.exercise_type add value if not exists '<novo>'`
   numa migration aditiva.
2. **Registro**: adicione uma entrada em `ACTIVITY_TYPES` (ou, se for criativo, um
   item em `lib/canvas/tools.ts` — o registro herda dele). Defina `family`,
   `autoXp`, `autoGraded`, `dedicatedPage` e, para `delivery`, `deliveryInput`.
3. **UI de entrega** (só se a família não cobrir): adicione o caso no render do
   aluno. Famílias existentes (`creative`/`delivery`) já têm componente.
4. **Teste**: o invariante de famílias já é coberto por
   `lib/activities/registry.test.ts`.

As validações de servidor (`lib/submissions/actions.ts`) e o form do professor
(`exercicios/novo/_form.tsx`) também leem do registro — não precisam ser tocados
para tipos que caem numa família existente.

## Pontos de junção (acoplamento conhecido e aceito)

Estes são compartilhados de propósito — são o "tronco" do modelo
CURSO → UC → TURMA. Mexer neles afeta várias features:

- **`assignments` + enum `assignment_kind`** — toda atividade da UC é uma
  `assignment` com um `kind` (`lista`, `duelo`, `unity`, `projeto_integrador`,
  `saep_simulado`). Adicionar uma feature de atividade = adicionar um `kind` e
  rotear no hub de atividades (`turmas/[id]/ucs/[classUnitId]/atividades`).
- **`class_units`** (turma × UC) — o contêiner de tudo. Features penduram aqui
  via `class_unit_id`.
- **`class_groups`** — grupos de alunos, reusados por projeto integrador.
- **`duel_ratings`** — ranking de ELO por UC, reusado por duelos de código e de
  quiz.
- **`profiles.xp` / `level`** — gamificação compartilhada.

## O que ainda NÃO é modular (limitações honestas)

- **Sem hot-plug real**: remover uma feature ainda exige editar arquivos
  (apagar pastas, limpar links cruzados). O `lib/features.ts` resolve o menu, mas
  não os atalhos contextuais entre features.
- **Tronco compartilhado**: features de atividade dependem do enum
  `assignment_kind` e de `class_units`. É coerência intencional, não
  independência total.
- **Testes cobrem regras puras**, não fluxo ponta-a-ponta (não há e2e ainda).

## Mapa atual de features

| Feature | `lib/` | Migration(s) | Rotas principais |
|---|---|---|---|
| Exercícios | `exercises`, `submissions`, `grading` | 0001, 0012 | `/exercicios`, `/turmas/.../listas` |
| Turmas/Currículo | `turmas`, `curriculum`, `attendance` | 0001, 0007, 0011 | `/turmas`, `/cursos`, `/planos` |
| Grupos | `groups` | 0013, 0014 | `/turmas/[id]/grupos` |
| Atividades na UC | (em `turmas`) | 0015, 0016, 0017 | `/turmas/.../ucs/.../atividades` |
| Duelos (código) | `duelos` (em `app`) | 0004, 0016 | `/turmas/.../ucs/.../duelos` |
| Unity | (em `app/unity`) | 0017 | `/turmas/.../ucs/.../unity` |
| Projeto integrador | `projects` | 0018 | `/turmas/.../ucs/.../projetos` |
| SAEP (teórico) | `saep` | 0019, 0020 | `/saep/questoes`, `/turmas/.../ucs/.../simulados`, `.../saep`, `.../duelos-quiz` |
| SAP (prático) | `sap` | 0021, 0022 | `/turmas/.../ucs/.../sap/[assignmentId]` |
| Dashboard UC | `dashboard` | — | `/turmas/.../ucs/.../dashboard` |
| IA | `ai` | 0003 | usada por exercícios e SAEP |

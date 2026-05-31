# Guia de UI/UX

Diretrizes para deixar a interface consistente e agradável. Estamos no meio de uma
padronização: telas novas já usam o **kit**; as antigas serão migradas aos poucos.

## Princípios
- **Clareza antes de enfeite**: o professor e o aluno precisam achar rápido o que importa (notas, frequência, próxima entrega).
- **Consistência**: mesmos componentes, espaçamentos e cores em todas as telas.
- **PT-BR** em tudo. Mensagens de erro úteis e específicas.
- **Imprimível**: relatórios funcionam no `window.print()` (PDF) sem quebrar.

## Tokens (em `web/src/app/globals.css`)
Cores: `primary` (roxo), `accent` (ciano), `success` (verde), `warning` (amarelo),
`danger` (vermelho), além de `background`/`card`/`muted`/`border`. Já têm modo escuro.
**Use sempre os tokens** (`text-primary`, `bg-card`, `border-border`...), nunca cores fixas.

## Kit de componentes (`web/src/components/ui/`)
- **Card / CardHeader** — bloco padrão (substitui `rounded-2xl border bg-card p-5` solto).
- **PageHeader** — título + descrição + ações no topo da página.
- **StatCard** — métrica/KPI (valor grande + dica), com `tone`.
- **StatusBadge** — pílula de status (presença, submissão, entrega) com cores mapeadas.
- **Table / THead / TH / TBody / TR / TD** — tabelas de listagem.
- **charts** — `ProgressBar`, `BarChart`, `Donut` (SVG/CSS, imprimem bem).
- **Button** (`primary|secondary|ghost|danger`), **Input/Field**.

Regra: ao criar uma tela nova, monte com esses componentes. Se faltar algo,
adicione ao kit (não crie estilos soltos na página).

## Telas a migrar para o kit (dívida visual)
Prioridade alta (mais vistas):
- `painel/page.tsx` — usar StatCard/Card (parcialmente já migrado).
- `turmas/page.tsx` e `turmas/[id]/page.tsx` — Card/PageHeader/StatusBadge.
- `exercicios/page.tsx` e `exercicios/[id]` — PageHeader, badges de dificuldade via StatusBadge.
- `turmas/[id]/listas/[lid]/page.tsx` — tabela de progresso com Table; já usa StatusBadge no aluno.

Prioridade média: ranking, duelos, cursos, unity.

## Padrões de layout
- Página: `flex flex-col gap-6`, começando por `Breadcrumbs` (quando há hierarquia) e `PageHeader`.
- Grids de cartões: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3/4`.
- Ações destrutivas: `ConfirmForm` + `Button variant="danger"`.

## Ideias de evolução visual (próximo ciclo)
- Sidebar de navegação (hoje é topo) com seções por papel.
- Estado vazio ilustrado e onboarding contextual.
- Tema claro/escuro alternável manualmente (hoje segue o SO).
- Microinterações (toasts de sucesso em vez de `alert()`).

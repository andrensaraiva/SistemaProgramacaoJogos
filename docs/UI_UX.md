# Guia de UI/UX

Diretrizes para manter a interface consistente e agradável.

## Princípios
- **Clareza antes de enfeite**: professor e aluno acham rápido o que importa (notas, frequência, próxima entrega).
- **Consistência**: mesmos componentes, espaçamentos e cores em todas as telas.
- **PT-BR** em tudo. Mensagens de erro úteis e específicas.
- **Imprimível**: relatórios funcionam no `window.print()` (PDF) sem quebrar.
- **Gamificado**: XP/nível e conquistas em destaque; cores vibrantes com brilho sutil onde faz sentido.

## Tema (claro/escuro)
- Tokens em `web/src/app/globals.css`. Dark é controlado pela **classe `.dark`** no `<html>`
  (não mais por `@media`). Um script anti-flash no `app/layout.tsx` aplica o tema salvo
  antes da hidratação; o `ThemeToggle` (no rodapé da sidebar) alterna e persiste em `localStorage`.
- Cores: `primary` (roxo), `accent` (ciano), `success`, `warning`, `danger`, `xp`/`xp-2`
  (dourado→rosa para XP), além de `background`/`card`/`muted`/`border`/`ring`.
  **Use sempre os tokens** (`text-primary`, `bg-card`...), nunca cores fixas.
- Utilitários: `.glow-primary`, `.glow-xp`, `.text-gradient`, `.xp-fill`.

## Navegação
- **Sidebar lateral** fixa (`components/app-sidebar.tsx`), agrupada em "Aprender" e "Turmas",
  com itens condicionais por papel e item ativo destacado. No mobile vira drawer.
- Rodapé da sidebar: perfil, **barra de XP** (`components/xp-bar.tsx`, aluno), `ThemeToggle` e Sair.

## Kit de componentes (`web/src/components/ui/`)
- **Card / CardHeader** — bloco padrão.
- **PageHeader** — título + descrição + ações no topo da página.
- **StatCard** — métrica/KPI com `tone`.
- **StatusBadge** — status do domínio (presença, submissão, entrega), cores mapeadas.
- **Badge** — rótulo genérico (dificuldade via `DIFFICULTY_TONE`/`DIFFICULTY_LABEL`, tipo, contadores).
- **Table / THead / TH / TBody / TR / TD** — listagens.
- **EmptyState / ErrorState** (`ui/states.tsx`) — estados vazios e de erro.
- **charts** — `ProgressBar`, `BarChart`, `Donut` (SVG, imprimem bem).
- **Button** (`primary|secondary|ghost|danger`), **Input/Field**.

Regra: ao criar uma tela, monte com esses componentes. Faltou algo? Adicione ao kit
(não crie estilo solto na página).

## Padrões de layout
- Página: `flex flex-col gap-6`, começando por `Breadcrumbs` (quando há hierarquia) e `PageHeader`.
- Grids de cartões: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3/4`.
- Cartão clicável: `<Link className="group"><Card className="group-hover:border-primary/50">`.
- Ações destrutivas: `ConfirmForm` + `Button variant="danger"`.

## Estado atual e próximos passos
As telas-índice (painel, turmas, exercícios, ranking, duelos, cursos) e todas as telas
novas (currículo, dashboard, grupos, notas, frequência) usam o kit e o tema. Refinos
ainda possíveis (backlog):
- Substituir `alert()` por toasts.
- Estados de carregamento (skeletons) nas listas.
- Revisar acessibilidade (foco visível, navegação por teclado) e densidade no mobile.
- Telas de formulário simples (nova turma, entrar, editar) podem ganhar PageHeader.

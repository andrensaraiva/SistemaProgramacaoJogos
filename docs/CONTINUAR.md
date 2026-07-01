# Onde estamos + para onde vamos

> **Comece por aqui.** Snapshot do projeto: o que é hoje, onde paramos, backlog e
> histórico resumido. Detalhes de como funciona por dentro em
> [ARCHITECTURE.md](ARCHITECTURE.md); como rodar em [SETUP.md](SETUP.md).
>
> **Última atualização:** 2026-07-01 · **Branch:** `main` (tudo mergeado) ·
> **Repo:** https://github.com/andrensaraiva/SistemaProgramacaoJogos

---

## O que é o projeto hoje

**Celeste Academy** — plataforma educacional institucional (SENAI) para ensino de
programação/jogos. Modelo **CURSO → UC → TURMA**: toda atividade (lista, prova,
desafio, duelo, Unity, projeto integrador, SAEP, SAP) vive dentro de uma UC de uma
turma (`class_unit`). Sem cadastro aberto: o **admin** cria professores, o
**professor** cria alunos. Banco: migrations `0001` → `0046`.

Frentes construídas (todas em `main`):

- **Identidades hierárquicas**: admin → professor → aluno, 2 e-mails por aluno,
  1º acesso (troca de senha + completar perfil), esqueci-senha por aprovação,
  notificações in-app.
- **Governança**: painel **admin** (master, configurações, stats, relatórios,
  feriados), papel **coordenador**, **salas/ocupação**, **calendário do curso**,
  **co-docência** (vários professores por turma) + feedback anônimo.
- **Currículo**: PPC → módulos → UCs (importação por IA) → plano de ensino
  (clonável) → frequência por aula do dia.
- **Atividades na UC**: exercícios (código/apresentação/modelo de resposta +
  **criativos**: pixel/vetor/arte/blocos), **SAEP** (teórico + dashboard por
  competência + duelo-quiz), **SAP prático** (rubrica), **projeto integrador**
  (board Trello com drag-and-drop + realtime), **duelos** de código, **Unity**
  (GitHub Classroom).
- **Experiência do aluno**: painel gamificado (XP/streak/conquistas), perfil
  estilo Discord + **loja de cosméticos** (moedas Celeste), jornada da UC
  (aprender → praticar), **modo prova** com lockdown, revisão de conteúdo por UC.

---

## Onde paramos (últimas sessões, jun/2026)

Foco recente: **experiência do aluno**. Últimos blocos em `main`:

- **Jornada da UC** (`aprender → praticar`) + exemplo do professor por exercício.
- **Modo prova com lockdown** + experiência de grupos para o aluno.
- **XP em toda entrega** + XP pela nota lançada pelo professor.
- **Perfil estilo Discord** + **loja de moedas Celeste**; painel/desempenho
  gamificados (hero XP animado, streak, conquistas, toasts).
- **Projeto integrador**: board com **drag-and-drop e tempo real** (fecha o
  backlog antigo desse item).
- Fix: aluno enxerga exercícios não-públicos atribuídos à sua turma.

A frente de aluno segue o roadmap em [ALUNO_DISCORD.md](ALUNO_DISCORD.md).
**Fase 1** (economia + loja + avatares) concluída; **Fases 2–5** pendentes.

---

## Próximos passos (backlog priorizado)

| Prioridade | Item | Observação |
|---|---|---|
| Alta | **Rodar a app e validar visualmente** o ciclo do aluno recém-construído | A validação recente foi majoritariamente `tsc`/`lint`/`test`/`build`. |
| Média | **ALUNO_DISCORD Fase 2** — shell do aluno (rail de turmas → canais → membros) | Ver [ALUNO_DISCORD.md](ALUNO_DISCORD.md). |
| Média | **ALUNO_DISCORD Fase 3** — feed `#atividades` (cards, reações, comentários) | Estende grading com nota→XP. |
| Baixa | **Deploy de produção** | Piston na Oracle Cloud + Vercel. Ver [DEPLOY.md](DEPLOY.md). |
| Baixa | **Fase 2 do modelo UC** | `class_unit_id` NOT NULL, remover `class_id`, aposentar rotas globais `/duelos` e `/unity`, reclassificar UC "Geral (migrado)". |
| Baixa | **Fluxo de e-mail (SMTP)** para senha temporária / notificações | Hoje a senha temporária é mostrada uma vez na tela. |
| Baixa | **Arduino** | Especificação pronta em [ARDUINO_PLANO.md](ARDUINO_PLANO.md); nada roda ainda. |

### Ideias por papel (backlog aberto)

- **Aluno**: shell/feed/chat estilo Discord (ver ALUNO_DISCORD), mural/avisos,
  notificações de prazo/correção, metas, acessibilidade (teclado, contraste, leitor).
- **Professor**: editor de casos de teste pela UI, nota em lote/por grupo no
  dashboard, exportar CSV/planilha, controle de prazo por exercício, reabrir entrega.
- **Admin/Coordenador**: auditoria (quem alterou nota/frequência), visão
  institucional (desempenho por curso/eixo, evasão), configurar integrações pela UI.
- **Plataforma**: deploy (Piston + Vercel), SMTP, upload de arquivos (Storage),
  testes automatizados (RLS/actions) + CI, Arduino.

---

## Histórico resumido

Do mais recente ao mais antigo (detalhe fica no `git log`):

- **2026-06-28→30** — Experiência do aluno: jornada da UC, modo prova (lockdown),
  XP por entrega/nota, board do projeto com drag-and-drop + realtime. *(0043, 0045, 0046)*
- **2026-06-24→25** — Perfil estilo Discord + loja de cosméticos (moedas Celeste);
  registry central de tipos de exercício. *(0039–0042, 0044)*
- **2026-06-07→08** — Governança institucional: admin (master/config/stats/
  relatórios/feriados), coordenador, salas/calendário, co-docência + feedback;
  editores criativos (pixel/vetor/arte/blocos); revisão por UC. *(0025–0038)*
- **2026-06-03→04** — Gestão de identidades hierárquica; rebrand **Celeste
  Academy** (fim do cadastro aberto). *(0024)*
- **2026-06-01→02** — Modelo **CURSO → UC → TURMA** (atividades na UC); frente
  **SAEP/SAP** completa (teórico + dashboard + duelo-quiz + SAP prático); projeto
  integrador; modularidade (registry de features + Vitest). Merge do refactor. *(0015–0023)*
- **2026-05-31** — Camada curricular (PPC → UC → plano → frequência); tipos de
  exercício; grupos; notas/dashboard por UC + PDF; kit de UI; Supabase CLI. *(0007–0014)*
- **2026-05-20** — Antifraude, IA (Gemini), duelos X1 (ELO), Unity/GitHub
  Classroom, tour de 1º acesso. *(0003–0006)*
- **2026-05-16** — Fundação: auth, exercícios no navegador (Monaco + Piston),
  turmas/listas, gamificação (XP/badges/ranking). *(0001–0002)*

---

## Como rodar (resumo)

Setup do zero em [SETUP.md](SETUP.md). Se o ambiente já está pronto:

```powershell
cd web
npx supabase db push      # aplica migrations novas (0001-0046)
npm run seed:demo:reset   # recria contas demo + Turma Demo (SAEP/SAP/currículo prontos)
npm run dev               # http://127.0.0.1:3000
```

Seeds: `seed:demo` / `seed:demo:reset` (base), `seed:experiencia` (experiência
gamificada do aluno), `seed:gamificacao` (ranking), `seed:identidades`.

**Contas demo** (senha `password123`, turma `DEMO2026`):

```text
Professor    : prof.demo@codequest.dev        (dono da turma)
Professor 2  : prof2.demo@codequest.dev       (co-docência)
Coordenador  : coord.demo@celeste.academy
Aluno 1      : aluno1.demo@codequest.dev
Aluno 2      : aluno2.demo@codequest.dev
```

## Comandos úteis

```powershell
cd web; npm run dev              # dev server (Webpack, 127.0.0.1)
cd web; npm run verify          # typecheck + lint + test + build
cd web; npm run test            # testes (Vitest, lógica pura)
cd web; npx supabase db push    # aplicar migrations

docker ps --filter name=piston_api   # Piston rodando?
docker start piston_api              # se parado

git status
git log --oneline -20
```

---

## Como invocar a próxima sessão

> "Continuando o **Celeste Academy** (branch `main`). Quero rodar a app e validar
> visualmente a experiência do aluno (jornada da UC, modo prova, perfil/loja) e
> seguir a Fase 2 do [ALUNO_DISCORD.md](ALUNO_DISCORD.md)."

Ou, se preferir deploy: "Vamos publicar — Piston na Oracle Cloud + Vercel
([DEPLOY.md](DEPLOY.md))."

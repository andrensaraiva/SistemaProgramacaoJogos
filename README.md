# Celeste Academy

Plataforma educacional gamificada e **institucional** (SENAI) para ensino de
programacao com foco em C#, jogos e Unity. Modelo **CURSO → UC → TURMA**: toda
atividade vive dentro de uma UC de uma turma. Sem cadastro aberto — o admin cria
professores; o professor cria alunos.

> **Onde estamos:** comece por [docs/CONTINUAR.md](docs/CONTINUAR.md) — estado,
> backlog e histórico do projeto num só lugar.

## Status

| Area | Estado |
|---|---|
| Identidades | Gestao hierarquica (admin→professor→aluno), 2 e-mails/aluno, 1º acesso, notificacoes |
| Governanca | Painel admin, coordenador, salas/ocupacao, calendario, co-docencia + feedback anonimo |
| Exercicios | Monaco + Piston; tipos: codigo, apresentacao, modelo de resposta e **criativos** (pixel/vetor/arte/blocos) |
| Turmas/Curriculo | PPC → modulos → UCs (import por IA) → plano de ensino (clonavel) → frequencia por aula |
| Atividades na UC | Listas, provas, desafios, duelos, Unity, projeto integrador, SAEP, SAP |
| SAEP | Matriz por curso, banco de questoes, simulado, dashboard por competencia, duelo-quiz |
| SAP pratico | Rubrica/lista de verificacao por desafio |
| Projeto integrador | Board estilo Trello por grupo com drag-and-drop e tempo real |
| Gamificacao | XP (entrega + nota→XP + badges), streak, ranking, **perfil Discord + loja de cosmeticos** |
| Antifraude | Paste, tempo, edicoes, score e similaridade; **modo prova com lockdown** |
| IA | Geracao de exercicios e importacao de PPC (Gemini) |
| Unity | Templates C# e Unity + notas por GitHub Classroom/GameCI |

Deploy: veja [docs/DEPLOY.md](docs/DEPLOY.md) (inclui o apêndice de como hospedar
o Piston na Oracle Cloud). A unica parte externa obrigatoria para producao e
hospedar o Piston em uma URL publica, porque a Vercel nao roda Docker local.

## Comecar rapido

```powershell
cd web
npm install
npm run dev
```

Abra `http://127.0.0.1:3000`.

## Supabase

Para banco novo, rode **`supabase/SETUP_COMPLETO.sql`** inteiro no SQL Editor
(reset + schema completo + seed base). Para mudanças incrementais use a Supabase
CLI: `npx supabase db push` (setup da CLI em [docs/SETUP.md](docs/SETUP.md)).

Para recriar dados demo:

```powershell
cd web
npm run seed:demo:reset
```

Contas demo:

```text
Professor: prof.demo@codequest.dev / password123
Aluno 1:   aluno1.demo@codequest.dev / password123
Aluno 2:   aluno2.demo@codequest.dev / password123
Turma:     DEMO2026
```

## Testes locais

```powershell
cd web
npx tsc --noEmit
npm run lint
npm run build
```

Ou rode tudo de uma vez:

```powershell
npm run verify
```

## Documentacao principal

Para contribuir: **[CONTRIBUTING.md](CONTRIBUTING.md)** → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) → [docs/SETUP.md](docs/SETUP.md).

Só 6 docs, um por assunto:

- [**DOCUMENTO_DO_SISTEMA**](docs/DOCUMENTO_DO_SISTEMA.md) — visão funcional completa: o que o sistema faz, funcionalidades e projeções futuras (sem código)
- [**CONTINUAR**](docs/CONTINUAR.md) — onde estamos: estado, backlog e histórico (comece aqui)
- [**ARCHITECTURE**](docs/ARCHITECTURE.md) — como funciona por dentro + modularidade + UI/UX
- [**SETUP**](docs/SETUP.md) — setup do zero + Supabase CLI + fluxo de teste
- [**DEPLOY**](docs/DEPLOY.md) — Vercel + Piston na Oracle Cloud
- [**ALUNO_DISCORD**](docs/ALUNO_DISCORD.md) — spec/roadmap ativo da experiência do aluno
- [**UI_AURORA_MINIMAL**](docs/UI_AURORA_MINIMAL.md) — design system do redesign visual (tokens, fontes, estágios)
- [**ARDUINO_PLANO**](docs/ARDUINO_PLANO.md) — spec futura (Arduino)

Padrões de contribuição (RLS, migrations, commits) em [CONTRIBUTING.md](CONTRIBUTING.md).

## Estrutura

```text
web/                         Next.js app
supabase/migrations/         schema e evolucoes do banco
supabase/seed/               seed SQL/docs
web/scripts/seed-demo.mjs    seed demo resetavel via service role
classroom-templates/         templates GitHub Classroom
docs/                        documentacao e fluxo de teste
```

# Sistema Jogos Programacao

Plataforma educacional gamificada para ensino de programacao com foco em C#,
jogos e Unity. O MVP inclui autenticacao, turmas, listas, editor Monaco,
execucao via Piston, XP, badges, ranking, sinais antifraude, geracao de
exercicios com Gemini, duelos X1 e templates para GitHub Classroom.

## Status

| Area | Estado |
|---|---|
| Auth | Login/cadastro Supabase com papeis aluno/professor |
| Exercicios | Monaco Editor, testes visiveis/ocultos, submissao e Piston |
| Turmas | CRUD, codigo de convite, listas e progresso |
| Gamificacao | XP por trigger, badges, ranking global e ranking de turma |
| Antifraude | Paste, tempo, edicoes, score e similaridade entre alunos |
| IA | Geracao de exercicios para professor e treino extra para aluno |
| Duelos | X1 por codigo, historico, ELO e vencedor por primeira submissao aprovada |
| Unity | Templates C# e Unity + notas por GitHub Classroom/GameCI |
| Curriculo | PPC → modulos → UCs → plano de ensino (clonavel) → frequencia por aula |
| Exercicios | Tipos: codigo, apresentacao (link) e modelo de resposta |
| Grupos | Grupos por turma e entrega em grupo |
| Notas/Dashboard | Notas do aluno por turma; dashboard por UC + relatorio PDF |

Deploy: veja [docs/DEPLOY.md](docs/DEPLOY.md). A unica parte externa obrigatoria
para producao e hospedar o Piston em uma URL publica, porque a Vercel nao roda
Docker local.

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
CLI: `npx supabase db push` (ver [docs/SUPABASE_CLI.md](docs/SUPABASE_CLI.md)).

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

Para contribuir: **[CONTRIBUTING.md](CONTRIBUTING.md)** → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) → [docs/SETUP_COMPLETO_PASSO_A_PASSO.md](docs/SETUP_COMPLETO_PASSO_A_PASSO.md).

- [Arquitetura](docs/ARCHITECTURE.md) — como o projeto funciona por dentro
- [Como contribuir](CONTRIBUTING.md) — padrões, RLS, migrations, commits
- [Roadmap & backlog](docs/ROADMAP.md) — feito + ideias por papel
- [UI/UX](docs/UI_UX.md) — kit visual e telas a migrar
- [Setup passo a passo](docs/SETUP_COMPLETO_PASSO_A_PASSO.md)
- [Supabase CLI](docs/SUPABASE_CLI.md) — aplicar migrations por comando
- [Fluxo de teste completo](docs/TEST_FLOW.md)
- [Projeto e funcionamento](docs/PROJETO_FUNCIONAMENTO.md)
- [Manual do professor](docs/MANUAL.md) · [Deploy](docs/DEPLOY.md) · [Status](docs/STATUS.md)

## Estrutura

```text
web/                         Next.js app
supabase/migrations/         schema e evolucoes do banco
supabase/seed/               seed SQL/docs
web/scripts/seed-demo.mjs    seed demo resetavel via service role
classroom-templates/         templates GitHub Classroom
docs/                        documentacao e fluxo de teste
```

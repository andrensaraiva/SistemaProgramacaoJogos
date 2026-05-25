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

Para banco novo, rode no SQL Editor:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_gamification_repair_idempotent.sql`
3. `supabase/migrations/0003_ai_cache.sql`
4. `supabase/migrations/0004_duel_elo_github.sql`

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

- [Fluxo de teste completo](docs/TEST_FLOW.md)
- [Projeto e funcionamento](docs/PROJETO_FUNCIONAMENTO.md)
- [Manual do professor](docs/MANUAL.md)
- [Setup](docs/SETUP.md)
- [Deploy](docs/DEPLOY.md)
- [Status](docs/STATUS.md)
- [Plano](docs/PLANO.md)
- [Como continuar](docs/CONTINUAR.md)

## Estrutura

```text
web/                         Next.js app
supabase/migrations/         schema e evolucoes do banco
supabase/seed/               seed SQL/docs
web/scripts/seed-demo.mjs    seed demo resetavel via service role
classroom-templates/         templates GitHub Classroom
docs/                        documentacao e fluxo de teste
```

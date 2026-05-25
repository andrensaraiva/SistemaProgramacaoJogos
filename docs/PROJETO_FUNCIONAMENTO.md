# Projeto e funcionamento

Este documento resume como a plataforma esta hoje, quais partes ja estao
implementadas e como o fluxo principal funciona de ponta a ponta.

## Visao geral

O projeto e uma plataforma web para ensino de programacao com foco em C#, jogos
e Unity. Ele combina:

- autenticacao com Supabase;
- perfis de aluno e professor;
- turmas com codigo de convite;
- listas de exercicios;
- editor Monaco no navegador;
- execucao e correcao de codigo via Piston;
- XP, niveis, conquistas e rankings;
- sinais antifraude;
- geracao de exercicios com Gemini;
- duelos X1 com ELO;
- templates para GitHub Classroom e Unity;
- sincronizacao de resultados do GitHub Actions.

O app principal fica em `web/` e usa Next.js App Router, TypeScript, Tailwind e
Server Actions.

## Estrutura principal

```text
SistemaProgramacaoJogos/
  web/                         App Next.js
  supabase/migrations/         Schema e evolucoes do banco
  supabase/seed/               Seeds SQL e dados demo
  classroom-templates/         Templates C# e Unity para GitHub Classroom
  docs/                        Documentacao do projeto
```

Arquivos importantes:

- `web/src/app/`: rotas e telas do app.
- `web/src/lib/auth/`: login, cadastro, sessao e perfil.
- `web/src/lib/supabase/`: clientes Supabase server/client/admin.
- `web/src/lib/exercises/`: tipos, juiz de saida e cliente Piston.
- `web/src/lib/turmas/actions.ts`: Server Actions de turmas e listas.
- `web/src/lib/ai/`: integracao e cache de Gemini.
- `supabase/migrations/0001_init.sql`: schema base.
- `supabase/migrations/0002_gamification_repair_idempotent.sql`: XP, badges e antifraude.
- `supabase/migrations/0003_ai_cache.sql`: cache de IA.
- `supabase/migrations/0004_duel_elo_github.sql`: ELO e GitHub Classroom.

## Perfis e autenticacao

O usuario cria conta em `/cadastrar` escolhendo o papel:

- `aluno`: entra em turmas, resolve exercicios, participa de duelos e acompanha XP.
- `professor`: cria turmas, listas, exercicios com IA, acompanha progresso e consulta notas GitHub.
- `admin`: tratado como professor com permissao ampliada.

A sessao e gerenciada pelo Supabase Auth. As rotas autenticadas ficam dentro de
`web/src/app/(app)/` e sao protegidas pelo `web/proxy.ts`.

Quando o usuario entra, `getProfile()` busca o perfil em `profiles`. Se a
migration de trigger falhar ou o perfil ainda nao existir, a propria DAL tenta
reparar criando o perfil com base nos metadados do usuario.

## Fluxo do professor

1. Cadastra ou entra como professor.
2. Abre `/painel`.
3. Cria uma turma em `/turmas/nova`.
4. Compartilha o codigo de convite com alunos.
5. Cria listas em `/turmas/[id]/listas/nova`.
6. Acompanha progresso em `/turmas/[id]/listas/[lid]`.
7. Pode gerar exercicios com IA em `/exercicios/gerar`.
8. Pode consultar notas do GitHub Classroom em `/unity/github`.

Na tela de progresso, o professor ve uma matriz aluno x exercicio com:

- status de cada submissao;
- quantidade de testes aprovados;
- alertas antifraude;
- similaridade alta entre codigos recentes.

## Fluxo do aluno

1. Cadastra ou entra como aluno.
2. No primeiro acesso ao `/painel`, ve um tour guiado.
3. Entra em uma turma por codigo em `/turmas/entrar`.
4. Abre a lista atribuida pela turma.
5. Resolve exercicios em `/exercicios/[id]`.
6. Usa `Testar` para rodar testes visiveis.
7. Usa `Enviar` para rodar todos os testes, inclusive ocultos.
8. Se aprovado, recebe XP automaticamente pelo banco.
9. Pode acompanhar ranking global, ranking da turma, badges e duelos.

## Exercicios e correcao

A tela do exercicio usa Monaco Editor no client. Existem dois caminhos:

- `Testar`: chama `POST /api/run`, executa apenas um teste rapido no Piston e nao salva nada.
- `Enviar`: chama a Server Action `submitSolution`, roda todos os testes, salva em `submissions` e dispara recompensas.

O Piston e o executor externo de codigo. Localmente ele roda em Docker em:

```text
http://localhost:2000/api/v2
```

Em producao, a Vercel nao roda Docker. Por isso `PISTON_API_URL` precisa apontar
para um Piston hospedado publicamente, por exemplo Fly.io, Railway, Render ou VPS.

## Gamificacao

A gamificacao e processada pelo banco quando uma submissao aprovada e inserida.

Hoje existem:

- XP por dificuldade;
- nivel calculado a cada 100 XP;
- badge de primeira submissao aprovada;
- badge por exercicios sem paste;
- badge por sequencia de 7 dias;
- badge por 5 vitorias em duelo;
- ranking global em `/ranking`;
- ranking da turma em `/turmas/[id]/ranking`.

O XP so e concedido na primeira aprovacao de cada exercicio por aluno, evitando
farm por reenvio.

## Antifraude

O Workbench coleta sinais durante a edicao:

- quantidade de eventos de paste;
- tempo entre primeira edicao e envio;
- quantidade de mudancas no editor.

Na submissao, esses dados viram:

- `paste_event_count`;
- `time_to_solve_ms`;
- `keystroke_count`;
- `suspicion_score`;
- `suspicion_reasons`.

Na tela da lista, o professor tambem ve indicios de codigos muito parecidos
entre alunos da mesma turma.

## IA com Gemini

Professores podem gerar exercicios em `/exercicios/gerar`. A IA cria:

- titulo;
- enunciado;
- codigo inicial;
- solucao interna;
- testes visiveis;
- testes ocultos.

Alunos tambem podem gerar exercicios extras similares ao atual. As respostas da
IA podem ser cacheadas pela migration `0003_ai_cache.sql`.

Variaveis:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
```

## Duelos X1

Os duelos ficam em `/duelos`.

Fluxo:

1. Um aluno cria duelo escolhendo exercicio publico.
2. O sistema gera um codigo.
3. Outro aluno entra com esse codigo.
4. O duelo muda para `em_andamento`.
5. Quem enviar primeiro uma submissao aprovada depois do inicio vence.
6. Ao clicar em `Atualizar vencedor`, o sistema conclui o duelo.
7. O vencedor ganha ELO e uma vitoria; o perdedor perde ELO e recebe derrota.

O ELO inicial e 1000 e usa fator K 32.

## Unity e GitHub Classroom

A pagina `/unity` mostra os templates:

- `classroom-templates/csharp-basico`;
- `classroom-templates/unity-projeto`.

A pagina `/unity/github` permite ao professor informar um repositorio no formato:

```text
dono/repositorio
```

O app consulta a GitHub API, pega a ultima execucao do GitHub Actions e salva:

- status;
- nota estimada;
- commit;
- link da action;
- aluno;
- atividade;
- turma.

Repositorios publicos funcionam sem token. Para repositorios privados, configure:

```env
GITHUB_PERSONAL_ACCESS_TOKEN=
```

## Banco de dados

As migrations devem ser aplicadas nesta ordem:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_gamification_repair_idempotent.sql`
3. `supabase/migrations/0003_ai_cache.sql`
4. `supabase/migrations/0004_duel_elo_github.sql`
5. `supabase/seed/0001_exercises.sql`

Para dados demo, use:

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

## Variaveis de ambiente

Local:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PISTON_API_URL=http://localhost:2000/api/v2
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
GITHUB_PERSONAL_ACCESS_TOKEN=
```

Producao:

Use `web/.env.production.example` como referencia. O ponto critico e trocar o
Piston local por uma URL publica.

## Deploy

O deploy alvo e Vercel.

Configuracao:

- Root Directory: `web`;
- Framework: `Next.js`;
- Build Command: `npm run build`;
- Install Command: `npm install`;
- Node.js: 20 ou superior.

Depois do deploy, valide:

```text
https://SEU-DOMINIO.vercel.app/api/health
```

Se `ok` estiver `false`, veja os campos em `checks`. O erro mais comum em
producao e `pistonLooksPublic: false`, que indica `PISTON_API_URL` apontando
para `localhost`.

## Como testar localmente

Subir app:

```powershell
cd web
npm install
npm run dev
```

Validar codigo:

```powershell
cd web
npm run verify
```

Testar template C#:

```powershell
cd classroom-templates/csharp-basico
dotnet test
```

Roteiro completo:

- `docs/TEST_FLOW.md`

## Estado atual

As fases principais do MVP estao implementadas:

- Fundacao;
- Auth;
- Exercicios no navegador;
- Turmas e listas;
- Gamificacao;
- Antifraude;
- IA;
- Duelos com ELO;
- Unity/GitHub Classroom;
- preparacao de deploy.

O principal item externo antes de usar em producao com alunos e hospedar o
Piston em uma URL publica e configurar essa URL na Vercel.

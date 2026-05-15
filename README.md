# Sistema Jogos Programação

Plataforma educacional gamificada para o ensino de programação com foco em **C# e Unity (jogos)**, com correção automática de código, geração de exercícios por IA, duelos entre alunos (X1), gestão de turmas e detecção de cola.

> Construída para reduzir o gargalo de correção manual e dar aos alunos um ambiente prático e motivador, no estilo Dio.me / FreeCodeCamp.

## Visão geral da arquitetura

Duas frentes complementares, todas no **free tier**:

### 1. Plataforma web (`/web`) — para exercícios curtos
Onde o aluno passa o tempo: teoria, exercícios de C# que rodam direto no navegador, gamificação, X1 e ranking.

| Camada | Tecnologia | Custo |
|---|---|---|
| Frontend | Next.js 15 + TypeScript + Tailwind | grátis |
| Hospedagem | Vercel | grátis (Hobby plan) |
| Banco / Auth / Realtime | Supabase | grátis (500 MB DB, 50k MAU) |
| Editor no browser | Monaco Editor | grátis (open source) |
| Execução de C# | Piston API pública | grátis |
| IA para gerar exercícios | Google Gemini | grátis (15 req/min) |

### 2. Projetos Unity (`/classroom-templates`) — via GitHub Classroom
Para projetos sérios de Unity, o workflow é Git: aluno faz push, GitHub Actions roda os testes (PlayMode/EditMode com `game-ci/unity-test-runner`), o resultado aparece tanto no GitHub quanto no dashboard da plataforma.

| Camada | Tecnologia | Custo |
|---|---|---|
| Turmas / entrega | GitHub Classroom | grátis para professor |
| CI / correção | GitHub Actions + game-ci | grátis (ilimitado em repo público) |
| Dashboard | a própria plataforma web puxa via GitHub API | grátis |

## Pastas

```
SistemaJogosProgramcao/
├── web/                  # Aplicação Next.js (a plataforma)
├── supabase/             # Migrations SQL e seeds do banco
├── classroom-templates/  # Repositórios-modelo de exercícios pra GitHub Classroom
│   ├── csharp-basico/    # Template para exercícios de C# puro
│   └── unity-projeto/    # Template para projetos Unity com testes
└── docs/                 # Documentação para o professor
```

## Próximos passos

Veja [docs/PLANO.md](docs/PLANO.md) para o roteiro de desenvolvimento e [docs/SETUP.md](docs/SETUP.md) para configurar o ambiente local.

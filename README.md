# Sistema Jogos Programação

Plataforma educacional gamificada para o ensino de programação com foco em **C# e Unity (jogos)**, com correção automática de código, geração de exercícios por IA, duelos entre alunos (X1), gestão de turmas e detecção de cola.

> Construída para reduzir o gargalo de correção manual e dar aos alunos um ambiente prático e motivador, no estilo Dio.me / FreeCodeCamp.

## Status atual

| Fase | Descrição | Status |
|---|---|---|
| Fase 1 | Autenticação (login, cadastro, papéis aluno/professor) | ✅ Concluída |
| **Fase 2** | **Exercício com Monaco Editor + execução via Piston API** | 🔜 Próxima |
| Fase 3 | Gestão de turmas (CRUD, convite, listas, progresso) | ✅ Concluída |
| Fase 4 | Gamificação (XP automático, badges, ranking) | — |
| Fase 5 | Antifraude (paste detection, telemetria, similaridade) | — |
| Fase 6 | IA — geração de exercícios com Gemini | — |
| Fase 7 | X1 — duelos PvP via Supabase Realtime | — |
| Fase 8 | Frente Unity (GitHub Classroom + game-ci) | — |
| Fase 9 | Polimento e deploy na Vercel | — |

## Visão geral da arquitetura

Duas frentes complementares, todas no **free tier**:

### 1. Plataforma web (`/web`) — exercícios curtos no navegador

Onde o aluno passa o tempo: teoria, exercícios de C#/Python que rodam no browser, gamificação, X1 e ranking.

| Camada | Tecnologia | Custo |
|---|---|---|
| Frontend | Next.js 16 + TypeScript + Tailwind 4 | grátis |
| Hospedagem | Vercel | grátis (Hobby plan) |
| Banco / Auth / Realtime | Supabase | grátis (500 MB DB, 50k MAU) |
| Editor no browser | Monaco Editor | grátis (open source) |
| Execução de código | Piston API pública | grátis |
| IA para gerar exercícios | Google Gemini | grátis (15 req/min) |

### 2. Projetos Unity (`/classroom-templates`) — via GitHub Classroom

Para projetos sérios de Unity, o workflow é Git: aluno faz push, GitHub Actions roda os testes (PlayMode/EditMode com `game-ci/unity-test-runner`), o resultado aparece no dashboard da plataforma.

| Camada | Tecnologia | Custo |
|---|---|---|
| Turmas / entrega | GitHub Classroom | grátis para professor |
| CI / correção | GitHub Actions + game-ci | grátis (repo público) |
| Dashboard | plataforma web puxa via GitHub API | grátis |

## Estrutura de pastas

```
SistemaJogosProgramacao/
├── web/                      # Aplicação Next.js (a plataforma)
│   └── src/app/
│       ├── (auth)/           # Login e cadastro
│       └── (app)/            # Área autenticada
│           ├── painel/       # Dashboard
│           ├── turmas/       # Gestão de turmas (Fase 3 ✅)
│           └── exercicios/   # Exercícios (Fase 2 🔜)
├── supabase/
│   └── migrations/           # Schema SQL + RLS (11 tabelas)
├── classroom-templates/      # Templates para GitHub Classroom (Fase 8)
└── docs/
    ├── PLANO.md              # Roteiro das 9 fases
    ├── SETUP.md              # Configurar do zero
    ├── STATUS.md             # Estado atual detalhado
    └── CONTINUAR.md          # Como retomar o desenvolvimento
```

## Começar

- 🔄 **Retomando o projeto?** Leia [docs/CONTINUAR.md](docs/CONTINUAR.md)
- 📋 **Estado atual detalhado?** Veja [docs/STATUS.md](docs/STATUS.md)
- 🗺️ **Roteiro completo?** Veja [docs/PLANO.md](docs/PLANO.md)
- ⚙️ **Configurar do zero?** Siga [docs/SETUP.md](docs/SETUP.md)

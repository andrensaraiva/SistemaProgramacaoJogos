# Plano de desenvolvimento

Roteiro incremental do MVP. Cada etapa entrega algo testável.

## Fase 0 — Fundação (você está aqui)
- [x] Estrutura de pastas e documentação inicial
- [x] Scaffolding Next.js com Tailwind e TypeScript
- [x] Esquema do banco no Supabase (migrations SQL)
- [x] Configuração documentada do projeto Supabase (criar projeto na dashboard, pegar keys)

## Fase 1 — Login e primeira tela útil
- [x] Autenticação via Supabase Auth (email + senha; Google opcional)
- [x] Diferenciação de papéis: `professor`, `aluno`
- [x] Landing page e onboarding
- [x] Dashboard básico do aluno (lista de turmas em que está)
- [x] Dashboard básico do professor (lista de turmas que criou)

## Fase 2 — O coração: exercício rodando no navegador
- [x] Página de exercício com Monaco Editor
- [x] API route `/api/run` que envia código pra Piston API e devolve resultado
- [x] Sistema de "casos de teste" (entrada → saída esperada)
- [x] Submissão: roda todos os casos de teste, marca aprovado/reprovado
- [x] Persistir submissão e resultado no banco

## Fase 3 — Gestão de turmas
- [x] CRUD de turmas (professor)
- [x] Convite por código pra aluno entrar na turma
- [x] CRUD de listas de exercícios e atribuição a turma
- [x] Visão do progresso: quem fez o quê, nota, tempo

## Fase 4 — Gamificação
- [x] XP e níveis por exercício resolvido (dificuldade ponderada)
- [x] Conquistas (badges) — primeira submissão verde, 7 dias seguidos, etc.
- [x] Ranking da turma e ranking global
- [x] Notificação ao aluno quando desbloquear badge nova

## Fase 5 — Antifraude
- [x] Hook de evento `paste` no Monaco — marca submissão como suspeita
- [x] Telemetria: tempo entre primeira tecla e submissão
- [x] Comparação de similaridade entre submissões da mesma turma
- [x] Notificação ao professor com nível de suspeita

## Fase 6 — IA (Gemini)
- [x] Endpoint para professor gerar exercício novo a partir de um prompt
- [x] Endpoint para aluno gerar "exercício extra" similar ao atual
- [x] Caching de exercícios gerados (evitar gastar quota)

## Fase 7 — X1 (PvP)
- [x] Sala de duelo por convite
- [x] Matchmaking simples por codigo
- [x] Mesmo exercício pros dois, primeiro a fazer todos os testes verdes ganha
- [x] Histórico de duelos
- [x] ELO

## Fase 8 — Frente Unity (paralela)
- [x] Template `classroom-templates/csharp-basico/` — projeto .NET com testes xUnit
- [x] Template `classroom-templates/unity-projeto/` — projeto Unity mínimo com PlayMode/EditMode tests + workflow do game-ci
- [x] Documentação: como o professor cria uma turma no GitHub Classroom e usa o template
- [x] Página na plataforma que puxa nota dos repositórios via GitHub API

## Fase 9 — Polimento e deploy
- [x] Preparação para deploy na Vercel documentada
- [x] Manual completo do professor (`docs/SETUP.md` e `docs/MANUAL.md`)
- [x] Tour guiado pro primeiro acesso do aluno

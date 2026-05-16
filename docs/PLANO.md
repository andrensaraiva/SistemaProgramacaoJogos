# Plano de desenvolvimento

Roteiro incremental do MVP. Cada etapa entrega algo testável.

## Fase 0 — Fundação (você está aqui)
- [x] Estrutura de pastas e documentação inicial
- [ ] Scaffolding Next.js 15 com Tailwind e TypeScript
- [ ] Esquema do banco no Supabase (migrations SQL)
- [ ] Configuração do projeto Supabase (criar projeto na dashboard, pegar keys)

## Fase 1 — Login e primeira tela útil
- [ ] Autenticação via Supabase Auth (email + senha; Google opcional)
- [ ] Diferenciação de papéis: `professor`, `aluno`
- [ ] Landing page e onboarding
- [ ] Dashboard básico do aluno (lista de turmas em que está)
- [ ] Dashboard básico do professor (lista de turmas que criou)

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
- [ ] XP e níveis por exercício resolvido (dificuldade ponderada)
- [ ] Conquistas (badges) — primeira submissão verde, 7 dias seguidos, etc.
- [ ] Ranking da turma e ranking global

## Fase 5 — Antifraude
- [ ] Hook de evento `paste` no Monaco — marca submissão como suspeita
- [ ] Telemetria: tempo entre primeira tecla e submissão
- [ ] Comparação de similaridade entre submissões da mesma turma
- [ ] Notificação ao professor com nível de suspeita

## Fase 6 — IA (Gemini)
- [ ] Endpoint para professor gerar exercício novo a partir de um prompt
- [ ] Endpoint para aluno gerar "exercício extra" similar ao atual
- [ ] Caching de exercícios gerados (evitar gastar quota)

## Fase 7 — X1 (PvP)
- [ ] Sala de duelo via Supabase Realtime
- [ ] Matchmaking simples (convite por link ou random na turma)
- [ ] Mesmo exercício pros dois, primeiro a fazer todos os testes verdes ganha
- [ ] Histórico de duelos e ELO

## Fase 8 — Frente Unity (paralela)
- [ ] Template `classroom-templates/csharp-basico/` — projeto .NET com testes xUnit
- [ ] Template `classroom-templates/unity-projeto/` — projeto Unity mínimo com PlayMode/EditMode tests + workflow do game-ci
- [ ] Documentação: como o professor cria uma turma no GitHub Classroom e usa o template
- [ ] Página na plataforma que puxa nota dos repositórios via GitHub API

## Fase 9 — Polimento e deploy
- [ ] Deploy na Vercel
- [ ] Manual completo do professor (`docs/SETUP.md` e `docs/MANUAL.md`)
- [ ] Tour guiado pro primeiro acesso do aluno

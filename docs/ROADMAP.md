# Roadmap & Backlog

## Feito até agora
- Auth + papéis (aluno/professor/admin), turmas, código no navegador (Monaco + Piston).
- Gamificação (XP, níveis, badges), antifraude, ranking, duelos X1.
- IA (gerar exercício, tutor no editor, importar PPC).
- Camada curricular: PPC → módulos → UCs → plano de ensino (clonável) → frequência por aula (com vários tempos no dia).
- **Tipos de exercício**: código, apresentação (entrega de link), modelo de resposta.
- **Grupos** por turma e entrega em grupo.
- **Notas do aluno** por turma; **dashboard do professor por UC** + **relatório PDF** (impressão).
- Kit de UI (`components/ui/`) e Supabase CLI configurada.

## Backlog por papel

### Aluno
- Mural/avisos da turma e notificações de prazo e de correção.
- Linha do tempo de progresso (XP ao longo do tempo) e metas.
- Comentar na correção (conversa professor↔aluno por entrega).
- Ver claramente quais entregas são em grupo e quem são os colegas.
- Acessibilidade: navegação por teclado, contraste, leitor de tela.

### Professor
- Editor de casos de teste de código pela UI (hoje vem do seed/IA).
- Rubricas de correção (critérios com pontos) para entregas não-código.
- Lançar nota em lote / por grupo direto no dashboard.
- Exportar CSV/planilha além do PDF; comparar turmas/UCs.
- Calendário de aulas e geração de frequência a partir do plano de ensino.
- Reabrir/!aceitar entregas após o prazo; controle de prazo por exercício.

### Admin
- Painel admin real: gerir usuários, papéis, turmas e cursos da instituição.
- Visão institucional: desempenho por curso/eixo, professores, evasão.
- Auditoria (quem alterou nota/frequência) e exportações gerenciais.
- Configurar linguagens/integrações (Piston, GitHub Classroom) pela UI.

### Plataforma
- Hospedar o Piston em produção (Vercel não roda Docker) — ver [DEPLOY.md](DEPLOY.md).
- Upload de arquivos (hoje a entrega é por link) via Supabase Storage, se necessário.
- Testes automatizados (RLS, server actions) e CI no GitHub.
- Arduino (ver [ARDUINO_PLANO.md](ARDUINO_PLANO.md)).

## Próximo ciclo sugerido
1. Redesenho de UI/UX (ver [UI_UX.md](docs/UI_UX.md)) — migrar telas antigas ao kit.
2. Editor de testes + rubricas (fecha o ciclo de criação de exercício pelo professor).
3. Painel admin mínimo (gestão de usuários e visão institucional).

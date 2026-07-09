# Celeste Academy — Documento do Sistema

> Visão funcional completa da plataforma: **o que ela faz e como funciona**, do
> ponto de vista de uso (não técnico). Para detalhes internos veja
> [ARCHITECTURE.md](ARCHITECTURE.md); para a identidade visual, veja
> [UI_AURORA_MINIMAL.md](UI_AURORA_MINIMAL.md).
>
> **Última atualização:** 2026-07-09

---

## 1. Visão geral

**Celeste Academy** é uma plataforma educacional institucional (modelo SENAI)
para o ensino de **programação e desenvolvimento de jogos**. Ela reúne, num só
lugar, tudo que um curso técnico precisa: o **currículo** (matriz do curso),
o **planejamento** das aulas, a **execução** em turmas, as **atividades e provas**,
a **correção e as notas**, a **frequência**, os **relatórios de gestão** e uma
camada de **gamificação** que engaja o aluno.

O princípio organizador é o modelo **CURSO → UC → TURMA**:

- Um **Curso** (ex.: Técnico em Jogos Digitais) é composto de **Módulos**, e cada
  módulo de **Unidades Curriculares (UCs)**.
- Uma **Turma** executa uma ou mais UCs. O vínculo "esta turma cursando esta UC"
  é a unidade central da plataforma.
- **Toda atividade** (lista de exercícios, prova, desafio, duelo, projeto,
  SAEP, SAP, Unity) acontece **dentro de uma UC de uma turma**.

Não há cadastro aberto: o acesso é **hierárquico e institucional** — o
administrador cria os professores, e o professor cria/gerencia os alunos.

---

## 2. Papéis e permissões

| Papel | O que faz |
|---|---|
| **Aluno** | Resolve exercícios, entrega trabalhos, faz provas/simulados, participa de duelos e projetos, acompanha notas e frequência, evolui na gamificação (XP, moedas, conquistas). |
| **Professor** | Cria e gerencia turmas, planos de ensino, atividades e provas; corrige e lança notas; registra frequência; acompanha quem precisa de atenção; vê o feedback dos alunos. |
| **Coordenador** | Supervisiona **qualquer** turma, gerencia salas e ocupação, acessa relatórios e as pesquisas de UC. Não participa da área gamificada. |
| **Administrador** | Governança institucional: cria professores/admins, define configurações da instituição, vê estatísticas e todos os relatórios, gerencia feriados e cursos. O **admin master** tem o controle mais alto. |

Cada papel vê apenas os menus e as telas pertinentes; o acesso direto por URL a
áreas de outro papel é bloqueado.

---

## 3. Acesso, identidades e conta

- **Identidades hierárquicas**: admin → professor → aluno.
- **Dois e-mails por pessoa**: institucional e pessoal (o login aceita qualquer
  um dos dois).
- **Primeiro acesso**: no primeiro login o usuário troca a senha temporária e
  completa o perfil.
- **Esqueci a senha**: solicitação que passa por **aprovação** (não é reset
  automático por e-mail — hoje a senha temporária é exibida uma vez na tela para
  quem tem permissão de resetar).
- **Notificações in-app**: avisos (correções, eventos, etc.) aparecem no sino da
  plataforma.

---

## 4. Estrutura curricular (o currículo vivo)

Transforma os PDFs estáticos (PPC, plano de ensino) em estrutura navegável:

- **Curso → Módulo → UC**, com, em cada UC: **carga horária**, **objetivo geral**,
  **capacidades/habilidades** (técnicas, socioemocionais, básicas), **objetos de
  conhecimento** (em árvore) e **bibliografia** (básica/complementar).
- **Importação por IA**: é possível gerar a estrutura de um curso a partir de um
  texto/documento, acelerando o cadastro da matriz.
- **Plano de Ensino** (do professor, **clonável** por colegas): dividido em
  **blocos/aulas** (ex.: "Aulas 01–12"), com conteúdo, apresentação, atividade e
  critérios.
- **Matriz de competências** (para SAEP/SAP): competências e objetos de
  conhecimento que as questões e rubricas referenciam, alimentando os dashboards
  por competência.

---

## 5. Turmas

- **Criação e convite**: cada turma tem um código de convite; o aluno entra com
  o código.
- **Membros**: lista de alunos matriculados.
- **Co-docência**: vários professores podem atuar numa turma; um professor pode
  ser definido **responsável por uma UC** específica.
- **Grupos**: alunos podem ser organizados em grupos (para trabalhos e projetos
  com entrega compartilhada).
- **Vínculo turma × UC**: cada UC executada na turma escolhe um plano de ensino e
  vira o "espaço" onde as atividades daquela disciplina acontecem.

---

## 6. Atividades e avaliações

Tudo vive dentro de uma UC da turma, em **listas/atividades**. Tipos:

### Tipos de exercício
- **Código**: o aluno programa no navegador (editor de código) e o sistema
  **executa** e corrige automaticamente contra **casos de teste** (entrada →
  saída esperada), incluindo **testes ocultos** que só rodam na correção final.
- **Apresentação**: entrega de um **link** externo (ex.: slides) + comentário.
- **Modelo de resposta**: o professor define um enunciado/modelo e o aluno
  **preenche em texto**.
- **Criativos**: editores embutidos de **pixel art**, **vetor**, **arte digital**
  e **blocos** (programação visual). Podem ser ligados/desligados pela instituição.

Exercícios podem ser **individuais ou em grupo**, e o professor pode anexar um
**exemplo** que fica visível ao aluno como referência.

### Modo prova (lockdown)
Uma atividade do tipo **prova** entra em modo restrito: se o aluno **sai da tela**
durante a prova, a plataforma registra e faz a **entrega automática**, avisando o
professor.

### SAEP — avaliação teórica
- **Banco de questões** no formato **Contexto / Comando / alternativas A–E**, com
  justificativa por alternativa e vínculo à matriz de competências.
- **Simulados** montados a partir do banco, com tempo e feedback.
- **Dashboard por competência** com acerto por área, para o professor identificar
  lacunas.
- **Duelo-quiz**: versão competitiva das questões.

### SAP — avaliação prática
- **Rubrica** hierárquica (Unidade → Elemento → Critério → Item Sim/Não com
  pontos), cada item ligado a uma competência/objeto de conhecimento.
- O aluno **entrega** (link do projeto) e o professor **avalia item a item**,
  gerando nota e feedback.

### Projeto Integrador
- **Board estilo Trello** com **sprints** e **tarefas** (a fazer / fazendo /
  concluído), **arrastar-e-soltar em tempo real**, atribuição por aluno.
- Alimenta o relatório de progresso dos projetos e recebe **notas de projeto**.

### Duelos de código
- **Duelo X1** de programação com **ranking ELO** (vitórias/derrotas afetam o
  rating do aluno).

### Unity / GitHub Classroom
- Integração para atividades de **Unity** via repositórios do GitHub Classroom.

---

## 7. Banco de exercícios compartilhado (catálogo)

Um **catálogo de exercícios entre professores**: cada exercício pode ser
**catalogado por UC(s)** do plano de curso, por **dificuldade** e com a etiqueta
**"sugerido para prova"**. Qualquer professor vê os exercícios (públicos) de todos
os colegas, **filtra** por curso, UC, dificuldade, prova e autor, e **aplica** um
exercício direto numa das suas turmas (numa lista existente ou criando uma nova) —
sem precisar recriar o exercício.

---

## 8. Correção, notas e antifraude

- **Correção automática** (código): pela execução contra os casos de teste.
- **Correção manual**: para entregas (apresentação, modelo de resposta, criativos,
  SAP), com **nota e feedback** escritos pelo professor.
- **Notas → XP**: a nota lançada pelo professor também recompensa o aluno com XP.
- **Notas de projeto**: avaliação dedicada dos projetos integradores.
- **Antifraude**: cada submissão registra **eventos de colagem (paste)**, **tempo
  até resolver**, **quantidade de edições** e um **score de suspeita**; o sistema
  ainda detecta **similaridade de código** entre alunos. Submissões com colagem
  **não geram XP**, e o professor vê os sinais destacados no painel de correção.

---

## 9. Frequência

- A frequência é registrada **por aula** (não só por dia): cada aula é uma
  **sessão** com número/período/data.
- Estados: **presente**, **falta**, **atraso**.
- O aluno acompanha a **própria frequência** por UC/turma; o professor faz a
  **chamada** rapidamente pelo checklist diário.

---

## 10. Calendário e salas

- **Calendário do curso** por turma: dias letivos, **feriados institucionais**,
  recessos, e alocação de **UCs e salas** por dia.
- **Metas de carga horária** por UC no calendário, com totalizador de progresso.
- **Salas e ocupação**: cadastro de salas (sala/laboratório/auditório) e visão de
  **ocupação** para a coordenação.
- **Aulas de hoje** aparecem no painel do professor.

---

## 11. Gamificação e experiência do aluno

A camada que engaja — inspirada em Discord/plataformas de jogo:

- **XP e níveis**: o aluno ganha XP resolvendo exercícios (com **multiplicador
  por dificuldade**) e pela nota lançada pelo professor; a cada 100 XP sobe de
  nível.
- **Moedas Celeste**: ganhas ao subir de nível, gastas na **Loja Celeste**.
- **Loja de cosméticos**: **molduras** de avatar, **banners** de perfil e **skins**
  de avatar — todos desbloqueáveis por moedas, alguns com trava por nível.
- **Ofensiva (streak)**: dias seguidos praticando, com recorde.
- **Missões diárias**: metas do dia que renovam e dão moedas ao concluir.
- **Conquistas (badges)**: marcos como "Primeira Vitória", "Semana Consistente",
  "Mão Própria" (sem colar), "Duelista", "Curioso".
- **Constelação de Conquistas**: no perfil, um **céu de estrelas** onde cada
  conquista é uma estrela que **acende** ao ser desbloqueada.
- **Ranking**: geral e por turma.
- **Painel gamificado**: hero de XP animado, streak, conquistas recentes,
  pendências ("a entregar"), desempenho por UC e atalhos.
- **Jornada da UC**: fluxo **aprender → praticar** dentro de cada unidade.

---

## 12. Perfil

- **Perfil do aluno** (estilo Discord): banner + avatar (com moldura e skin),
  nível/XP, saldo de moedas, streak, a **Loja Celeste** e a **Constelação de
  Conquistas**.
- **Perfil do professor** (profissional): identidade (avatar, nome, e-mails),
  **impacto de ensino** (turmas, alunos, exercícios criados, avaliação média dos
  alunos), lista de turmas e a **reputação** (feedback anônimo dos alunos).

---

## 13. Feedback, pesquisas e checklist

- **Feedback anônimo do professor**: o aluno avalia o professor/aula com estrelas
  e comentário; o professor vê o resumo **sem saber quem enviou** (um mecanismo
  impede voto duplicado sem revelar a identidade).
- **Pesquisa de UC**: quando uma UC **encerra**, o aluno é convidado a respondê-la
  **anonimamente** (infraestrutura, didática, ritmo, geral + comentário); a
  coordenação vê os resultados agregados.
- **Checklist diário do professor**: por turma, ajuda o professor a não esquecer a
  chamada e o registro do plano de aula do dia.

---

## 14. Coordenação e administração

- **Painel administrativo**: números da instituição, criação de professores/admins.
- **Configurações institucionais**: cortes de **nota** e **frequência** (com
  reclassificação de situação), quais **ferramentas criativas** ficam habilitadas,
  etc.
- **Relatórios** (com exportação **CSV** e **impressão/PDF**):
  - **Institucional** (visão geral),
  - **Professores** (frequência/plano/execução),
  - **Turmas** e **Alunos em risco** (recuperação/reprovação),
  - **SAEP/SAP** por competência (com drill-down),
  - **Projetos integradores** (progresso),
  - **Feedback** por professor/turma.
- **Feriados** institucionais e **cursos** (matrizes).
- **Coordenador**: mesmas visões de supervisão + salas/ocupação + pesquisas de UC.

---

## 15. Identidade visual — "Aurora Minimal"

A interface segue o conceito **Celeste Academy — Aurora Minimal**: elegante,
celestial e premium, com paleta de **roxo celestial, lavanda, navy profundo e
ouro**, marca com **lua crescente**, e detalhes de **constelação** onde reforçam
a marca. O **tema (claro/escuro) é escolha de cada usuário**; o estilo vale nos
dois. Detalhes em [UI_AURORA_MINIMAL.md](UI_AURORA_MINIMAL.md).

---

## 16. Projeções futuras (roadmap)

Ideias e frentes planejadas, por área:

### Experiência do aluno
- **Shell estilo Discord** (Fases 2–5 do roadmap do aluno): rail de turmas →
  canais → membros; **feed `#atividades`** com cards, reações e comentários;
  chat/mural de avisos.
- Notificações de **prazo e correção**; **metas** pessoais.
- **Acessibilidade** reforçada (navegação por teclado, contraste, leitor de tela).

### Professor
- **Editor de casos de teste** pela própria interface.
- **Nota em lote / por grupo** direto no dashboard; **reabrir entrega**;
  **controle de prazo por exercício**.
- **Exportação** para CSV/planilha das notas.
- Evolução do **perfil do professor**: "membro desde", horas/aulas ministradas,
  planos criados, edição do próprio perfil, vitrine de marcos de ensino.

### Coordenação / Administração
- **Auditoria** (quem alterou nota/frequência).
- **Visão institucional** por curso/eixo e indicadores de **evasão**.
- Configurar **integrações** pela UI.

### Plataforma
- **Deploy de produção** (execução de código + hospedagem).
- **E-mail (SMTP)** para senha temporária e notificações.
- **Upload de arquivos** (armazenamento) para entregas.
- **Fase 2 do modelo UC** (consolidar tudo sob a UC, aposentar rotas globais
  antigas).
- **Testes automatizados** de permissões/ações + integração contínua.
- **Arduino**: frente de hardware já especificada, ainda não implementada.

---

> Este documento descreve o **comportamento e as funcionalidades** do sistema.
> A lista completa de telas está no menu de cada papel; a evolução recente fica
> registrada no histórico do projeto.

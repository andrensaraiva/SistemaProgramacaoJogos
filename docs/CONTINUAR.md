# Como continuar o projeto

> **Documento de retomada. Leia isto primeiro ao voltar a trabalhar.**
> **Última sessão:** 2026-06-02
> **Branch atual:** `refactor/atividades-na-uc` (ainda **não** mergeada em `main`)
> **Repositório:** https://github.com/andrensaraiva/SistemaProgramacaoJogos

Para o histórico detalhado por data, veja [STATUS.md](STATUS.md). Este arquivo é o
"onde paramos + o que fazer agora".

---

## TL;DR — o que fazer agora

O projeto passou por uma **reorientação de modelo** (de "Duolingo" para
**CURSO → UC → TURMA**) e ganhou três features grandes. Tudo está na branch
`refactor/atividades-na-uc`, com typecheck + lint limpos, mas **ainda não foi
mergeado nem rodado na app** (só validado com `tsc`, `eslint` e `supabase db push`).

**Próximos passos, em ordem de recomendação:**

1. **Rodar a app e validar visualmente** o que foi construído (ver "Como testar" abaixo).
   Nada foi clicado num navegador ainda.
2. **SAP prático** (rubrica/lista de verificação Unidade→Elemento→item Sim/Não/pontos,
   conforme os PDFs do SENAI) — último item grande do SAEP/SAP.
3. Quando estável, **merge da branch em `main`**.

> **Modularidade**: o projeto é organizado por features desacopladas. Antes de
> adicionar/remover uma, leia [MODULOS.md](MODULOS.md). Há testes (Vitest):
> `npm run test`. Ao criar regra de cálculo/correção, extraia a parte pura num
> módulo e teste-a (padrão: `lib/saep/scoring.ts`, `lib/dashboard/bands.ts`).

---

## Onde paramos (sessão de 2026-06-01)

Quatro blocos de trabalho, todos commitados na branch `refactor/atividades-na-uc`:

### 1. Atividades vivem dentro da UC (turma × UC)
Reorientação do modelo. Toda atividade (lista, prova, desafio, duelo, Unity,
projeto integrador, simulado SAEP) é uma `assignment` ligada a um `class_unit`
(turma × UC), não mais solta por turma.
- Migrations `0015` (assignments + kinds novos), `0016` (duelos + ELO contextual
  `duel_ratings`), `0017` (Unity por UC).
- Hub de atividades em `turmas/[id]/ucs/[classUnitId]/atividades`.
- `exercises` continua sendo **banco reutilizável**; só a atribuição vincula à UC.
- `class_id` mantido por compat — **Fase 2 pendente**: tornar `class_unit_id` NOT
  NULL, remover `class_id`, aposentar rotas globais `/duelos` e `/unity`,
  reclassificar atividades que caíram na UC "Geral (migrado)".

### 2. Projeto Integrador (TCC) — board estilo Trello por grupo
- Migration `0018`: `projects` (1:1 com a atividade `kind=projeto_integrador`)
  → `project_sprints` → `project_tasks` (cards por grupo).
- Página em `turmas/[id]/ucs/[cu]/projetos/[assignmentId]`: professor configura +
  cria sprints; cada grupo tem seu board (3 colunas, cards movidos por botão).
- **Sem drag-and-drop e sem tempo real ainda** (decisão de MVP). Falta entrega/nota.

### 3. SAEP teórico — matriz + banco de questões (1ª fatia)
- Migration `0019`: matriz **por curso** (`competency_matrices` → `competencies`
  C1-C8 + `knowledge_objects` A-T), banco de questões formato SAEP
  (`quiz_questions` + `quiz_options` A-E com correta e justificativa), simulados,
  tentativas e respostas.
- `lib/saep/actions.ts` (matriz, questão manual, simulado, tentativa) e
  `lib/saep/ai.ts` (gera questão no formato SAEP via Gemini — o instrutor revisa).
- Banco de questões em `/saep/questoes` (lista/nova/editar) com editor de entrada
  manual + botão "Gerar sugestão". Link **SAEP** na sidebar (professor).

### 4. SAEP — simulado dentro da UC (2ª fatia)
- Página em `turmas/[id]/ucs/[cu]/simulados/[assignmentId]` (chaveada pelo
  assignment_id; `quiz_simulados` criado na 1ª visita via `obterOuCriarSimulado`).
- Professor (`_manager`): configura (título/descrição/tempo/mostrar gabarito) e
  monta selecionando questões do banco.
- Aluno (`_responder`): inicia → responde (1 alternativa/questão, cronômetro que
  envia ao zerar) → envio único → resultado (%/acertos) + gabarito/justificativa/
  resolução se habilitado. **Corretas só são expostas após o envio.**
- Correção automática + XP de bônus (15 por acerto).

### 5. SAEP — dashboard por competência (3ª fatia)
- `lib/saep/dashboard.ts` (`getSaepDashboard`): % de acerto por competência, objeto
  de conhecimento e aluno numa UC.
- Página `turmas/[id]/ucs/[cu]/saep` (só o dono): cards de resumo, "pontos a
  reforçar" (3 competências de menor acerto), barras por competência/objeto e tabela
  por aluno. Link na lista de UCs e na página do simulado.

### 6. SAEP — duelo de quiz (4ª fatia)
- Migration `0020` + `lib/saep/duelo.ts`: X1 onde dois alunos respondem o mesmo
  conjunto sorteado de questões da UC; vence quem acerta mais (desempate por tempo).
  ELO reusa `duel_ratings` (mesmo ranking dos duelos de código).
- Página `turmas/[id]/ucs/[cu]/duelos-quiz` (lobby criar/entrar + lista + ranking) e
  `[duelId]` (responder/resultado). Links cruzados com os duelos de código.

---

## O que falta (backlog priorizado)

| Prioridade | Item | Observação |
|---|---|---|
| Média | **SAP prático** | Rubrica/lista de verificação (Unidade→Elemento→Padrão→item Sim/Não/pontos) ligada à entrega. Ver os PDFs do SENAI (lista de verificação). Último item grande do SAEP/SAP. |
| Média | **Fase 2 do modelo UC** | `class_unit_id` NOT NULL, remover `class_id`, aposentar `/duelos` e `/unity` globais, reclassificar UC "Geral (migrado)". |
| Baixa | Projeto integrador: drag-and-drop, tempo real (Supabase Realtime), entrega/nota | Polimento do board. |
| Baixa | Cadastro da matriz de competências por UI | Hoje a action `salvarMatriz` existe, mas falta uma tela amigável para o professor cadastrar a matriz do curso. |

---

## Como testar o que foi construído

Pré-requisitos: Supabase + `.env.local` configurados, Piston em Docker rodando
(ver seção "Setup do zero" mais abaixo, se for outra máquina).

```powershell
cd web
npx supabase db push   # garante as migrations 0015-0019 aplicadas
npm run dev
```

Fluxos para clicar (logado como **professor**):
1. **Curso → UC → Turma**: vincule uma UC a uma turma (`turmas/[id]/ucs`).
2. **Atividades na UC**: abra "Atividades" da UC e crie uma lista, um duelo, um
   projeto integrador e um simulado SAEP.
3. **Projeto integrador**: configure, crie sprints, monte grupos (em
   `turmas/[id]/grupos`) e veja os boards.
4. **SAEP**: em **SAEP → Banco de questões**, crie uma questão (manual e/ou
   "Gerar sugestão" com IA). Depois abra o simulado da UC, configure e selecione
   as questões.
5. Logado como **aluno** (navegador anônimo): responda o simulado e veja o resultado.

> **Ainda não foi rodado na app.** Se algo quebrar em runtime, é esperado — a
> validação até agora foi só `tsc --noEmit`, `eslint .` e `supabase db push`.

---

## Comandos úteis

```powershell
cd web; npm run dev              # dev server
cd web; npx tsc --noEmit        # type-check
cd web; npm run lint            # lint
cd web; npm run test            # testes (Vitest, logica pura)
cd web; npm run verify          # typecheck + lint + test + build
cd web; npx supabase db push    # aplicar migrations

docker ps --filter name=piston_api   # Piston rodando?
docker start piston_api              # se parado

git status
git log --oneline main..HEAD         # commits da branch atual
```

---

## Setup do zero (só se for outra máquina)

Se você está no PC onde já fez tudo, pula esta seção.

1. **Supabase**: cria projeto, roda as migrations de `supabase/migrations/` em
   ordem (`npx supabase db push`), habilita Email Provider (Confirm email OFF),
   copia URL + chaves.
2. **`.env.local` em `web/`** (formato novo `sb_publishable_` / `sb_secret_`):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
   GEMINI_API_KEY=AIza...
   GEMINI_MODEL=gemini-flash-latest
   PISTON_API_URL=http://localhost:2000/api/v2
   ```
3. **Piston em Docker** (a API pública emkc.org virou whitelist-only em 15/02/2026):
   ```powershell
   docker volume create piston_data
   docker run -d --name piston_api --privileged --restart unless-stopped `
     -v piston_data:/piston -p 2000:2000 ghcr.io/engineer-man/piston:latest
   $body = '{"language":"dotnet","version":"5.0.201"}'
   Invoke-RestMethod -Uri "http://localhost:2000/api/v2/packages" -Method Post `
     -ContentType "application/json" -Body $body
   ```
4. **App**: `cd web; npm install; npm run dev` → http://localhost:3000

---

## Como invocar a próxima sessão

> "Continuando o projeto, branch `refactor/atividades-na-uc`. SAEP teórico está
> completo (banco + simulado + dashboard + duelo de quiz). Bora pro **SAP prático**
> (rubrica/lista de verificação Unidade→Elemento→item Sim/Não/pontos)."

Ou, se preferir validar antes: "Roda a app e me mostra o fluxo do simulado SAEP
funcionando (professor monta → aluno responde → resultado → dashboard)."

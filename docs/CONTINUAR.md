# Como continuar o projeto

## Atualizacao 2026-05-20

A Fase 4 foi iniciada. Ja existem:

- Migration `supabase/migrations/0002_gamification.sql` com `xp_awarded`, trigger de XP/level, multiplicador por dificuldade e badges automaticos.
- `submitSolution` usando o XP retornado pelo banco, sem update manual em `profiles`.
- Ranking global em `/ranking`.
- Ranking da turma em `/turmas/[id]/ranking`.
- Notificacao na tela de submissao quando uma badge nova for desbloqueada.

Proximo passo natural: testar a migration no Supabase real e seguir para a Fase 5 (antifraude).

Fase 5 tambem foi iniciada:

- Workbench captura paste, contagem de mudancas no editor e tempo ate submissao.
- `submitSolution` salva esses sinais em `submissions` e calcula `suspicion_score`/`suspicion_reasons`.
- A tela de progresso da lista mostra alertas antifraude para o professor.
- A tela tambem compara as submissões mais recentes e sinaliza codigo muito parecido entre alunos.

Fase 6 foi iniciada:

- Professores podem acessar `/exercicios/gerar` para gerar exercicios C# com Gemini.
- A geracao cria exercicio, solucao interna e testes visiveis/ocultos no Supabase.
- Alunos podem gerar exercicio extra similar pela tela do exercicio.
- A migration `0003_ai_cache.sql` adiciona cache opcional das respostas da IA.
- Configure `GEMINI_API_KEY` no `.env.local`; `GEMINI_MODEL` e opcional.

Fase 7/8 foram iniciadas:

- `/duelos` cria duelos por codigo e calcula vencedor pela primeira submissao aprovada.
- Duelos concluidos atualizam ELO, vitorias, derrotas e badge `duel_win_5`.
- `/unity` aponta para templates GitHub Classroom em `classroom-templates/`.
- `/unity/github` sincroniza repositorios via GitHub API e mostra nota estimada a partir do GitHub Actions.
- Aplique tambem `supabase/migrations/0004_duel_elo_github.sql`.

Fase 9 foi iniciada:

- Alunos recebem um tour guiado no primeiro acesso ao `/painel`.

Proximo passo natural: rodar o fluxo completo em `docs/TEST_FLOW.md`, testar `/exercicios/gerar` com uma chave Gemini valida e fazer o deploy na conta Vercel escolhida.

> Documento de retomada. Leia isso primeiro quando voltar a trabalhar.
> **Data da última sessão:** 2026-05-16
> **Repositório:** https://github.com/andrensaraiva/SistemaProgramacaoJogos

## TL;DR — o que fazer agora

Fases 1, 2 e 3 estão **completas e rodando**. Pra retomar:

1. Clone o repo e instale deps (se for outra máquina):
   ```powershell
   git clone https://github.com/andrensaraiva/SistemaProgramacaoJogos.git
   cd SistemaProgramacaoJogos\web
   npm install
   ```
2. Configure Supabase + `.env.local` + seeds (passos abaixo, se for setup novo)
3. Suba o **Piston em Docker** (necessário pra rodar código C#)
4. Continue a **Fase 4** do [PLANO.md](PLANO.md) — gamificação: trigger automático de XP, badges, ranking.

---

## Onde paramos

As **Fases 1, 2 e 3** estão completas e commitadas:

**Fase 1 — Autenticação:**
- Login / Cadastro / Logout via Supabase Auth com Server Actions
- Proteção de rotas via [proxy.ts](../web/proxy.ts) global
- Diferenciação de papéis: `aluno` vs `professor`
- Tema customizado com paleta e dark mode

**Fase 2 — Exercício no navegador:**
- Lista em `/exercicios` com 3 exercícios C# públicos (via seed)
- Resolução com Monaco Editor lazy-loaded
- Botão "Testar" → `/api/run` → Piston self-hosted
- Botão "Enviar" → Server Action roda todos os casos (incl. ocultos), persiste em `submissions`, dá XP/level
- Validado: "Olá, Mundo!" → +10 XP no painel ✅

**Fase 3 — Gestão de turmas:**
- Professor: criar, editar, excluir turmas; criar e excluir listas
- Aluno: entrar em turma com código de convite de 8 chars; sair
- Página de turma com código copiável e lista de membros (professor)
- Visão de progresso: professor vê tabela alunos × exercícios; aluno vê próprio status

---

## Setup do zero (só se for outra máquina)

Se você está no PC onde já fez tudo, pula essa seção.

### 1. Supabase (uma vez)
- Cria projeto em https://supabase.com/dashboard (região `sa-east-1`, free)
- SQL Editor → roda [supabase/migrations/0001_init.sql](../supabase/migrations/0001_init.sql)
- Cadastra-se primeiro como Professor em `/cadastrar` (precisa de pelo menos 1 perfil)
- SQL Editor → roda [supabase/seed/0001_exercises.sql](../supabase/seed/0001_exercises.sql) (3 exercícios C# públicos)
- Authentication → Email Provider: **Enable** ON, **Confirm email** OFF
- Settings → API: copia URL, anon key, service_role key

### 2. `.env.local` em `web/`
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
GEMINI_API_KEY=AIza...
PISTON_API_URL=http://localhost:2000/api/v2
```

### 3. Piston em Docker (necessário pra rodar código)

A API pública do Piston (emkc.org) virou whitelist-only em **15/02/2026**. Subimos o nosso:

```powershell
# Docker Desktop precisa estar rodando (baleia verde no tray)
docker volume create piston_data
docker run -d --name piston_api --privileged --restart unless-stopped `
  -v piston_data:/piston -p 2000:2000 ghcr.io/engineer-man/piston:latest

# Instalar dotnet (única vez — fica no volume)
$body = '{"language":"dotnet","version":"5.0.201"}'
Invoke-RestMethod -Uri "http://localhost:2000/api/v2/packages" -Method Post `
  -ContentType "application/json" -Body $body
```

Confirma que `csharp.net` aparece em `http://localhost:2000/api/v2/runtimes`.

### 4. Subir o app
```powershell
cd web
npm install
npm run dev
```

Abre http://localhost:3000 — cria conta como Professor, depois outra como Aluno (navegador anônimo), e testa o fluxo completo (turma + lista + resolver exercício).

---

## O que vem depois — Fase 4 (próxima)

Gamificação completa:

- **XP automático via trigger no DB** — hoje o XP é dado manualmente pelo Server Action `submitSolution`. Migrar pra trigger PostgreSQL em `submissions` aprovadas, multiplicando por dificuldade (fácil=1x, médio=1.5x, difícil=2x, desafio=3x).
- **Distribuição automática de badges** — quando um aluno bate uma condição (primeira aprovada, 7 dias seguidos, 10 exercícios sem paste, etc.), insere em `user_badges` automaticamente.
- **Ranking da turma + ranking global** — view ou query agregada por XP.
- **Notificação ao aluno** quando ganha badge novo (toast no painel).

**Arquivos esperados:**
- `supabase/migrations/0002_xp_trigger.sql` (trigger + função)
- `web/src/app/(app)/ranking/page.tsx` (ranking global)
- `web/src/app/(app)/turmas/[id]/ranking/page.tsx` (ranking da turma)
- `web/src/lib/badges/check.ts` (lógica de verificação de condições)
- Refatorar `submitSolution` pra remover o `update profiles set xp = ...` manual

### Fases 5+ — Antifraude, IA, X1, Unity, Polimento
Roteiro completo em [PLANO.md](PLANO.md).

---

## Como invocar a próxima sessão

Quando reabrir o Claude Code aqui, manda algo como:

> "Continuando o projeto. Fases 1, 2 e 3 estão prontas e rodando. Bora pra Fase 4: gamificação (trigger automático de XP, badges, ranking)."

---

## Comandos úteis

```powershell
# Dev server
cd web; npm run dev

# Dev server com Turbopack, se a maquina tiver memoria sobrando
cd web; npm run dev:turbo

# Type-check (sem build)
cd web; npx tsc --noEmit

# Lint
cd web; npm run lint

# Build de produção
cd web; npm run build

# Piston container
docker ps --filter name=piston_api          # ver se está rodando
docker start piston_api                     # se estiver parado
docker logs piston_api --tail 30            # se quebrou

# Git
git status
git log --oneline
```

---

## Estrutura atual de pastas

```
SistemaProgramacaoJogos/
├── README.md
├── .gitignore
├── docs/
│   ├── PLANO.md              # Roteiro das 9 fases
│   ├── SETUP.md              # Configurar do zero (Supabase + Docker)
│   ├── STATUS.md             # Snapshot atual
│   └── CONTINUAR.md          # Este arquivo
├── supabase/
│   ├── migrations/
│   │   └── 0001_init.sql     # 11 tabelas + RLS + seed badges
│   └── seed/
│       └── 0001_exercises.sql # 3 exercícios C# públicos
└── web/                       # Next.js 16
    ├── package.json
    ├── proxy.ts               # Proteção global de rotas
    ├── .env.example
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx                       # Landing pública
        │   ├── (auth)/
        │   │   ├── entrar/                    # Login
        │   │   └── cadastrar/                 # Cadastro (aluno/professor)
        │   ├── (app)/                         # Rotas autenticadas
        │   │   ├── layout.tsx                 # Header + nav + logout
        │   │   ├── painel/                    # Dashboard
        │   │   ├── exercicios/                # ← FASE 2
        │   │   │   ├── page.tsx               # Lista
        │   │   │   └── [id]/
        │   │   │       ├── page.tsx           # Server: busca exercício + testes visíveis
        │   │   │       ├── _workbench.tsx     # Client: Monaco + Testar/Enviar
        │   │   │       └── actions.ts         # submitSolution
        │   │   └── turmas/                    # ← FASE 3
        │   │       ├── page.tsx               # Lista de turmas
        │   │       ├── nova/                  # Criar turma (professor)
        │   │       ├── entrar/                # Entrar com código (aluno)
        │   │       └── [id]/
        │   │           ├── page.tsx           # Detalhe: membros, listas, convite
        │   │           ├── editar/            # Editar turma
        │   │           └── listas/
        │   │               ├── nova/          # Criar lista
        │   │               └── [lid]/         # Progresso: alunos × exercícios
        │   └── api/
        │       └── run/                       # ← FASE 2: POST → Piston
        ├── components/
        │   ├── logo.tsx
        │   ├── confirm-form.tsx               # Wrapper de confirm() client-side
        │   └── ui/
        │       ├── button.tsx
        │       └── input.tsx
        └── lib/
            ├── auth/
            │   ├── actions.ts                 # login, signup, logout
            │   └── dal.ts                     # verifySession, getProfile, isProfessor
            ├── exercises/                     # ← FASE 2
            │   ├── types.ts
            │   ├── judge.ts                   # compareOutputs (normaliza \r\n e trailing ws)
            │   └── piston.ts                  # cliente Piston (csharp.net)
            ├── turmas/
            │   └── actions.ts                 # 7 server actions
            └── supabase/
                ├── client.ts
                ├── server.ts
                ├── middleware.ts
                └── admin.ts                   # cliente service_role (server-only)
```

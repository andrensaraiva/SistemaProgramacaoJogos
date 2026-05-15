# Como continuar o projeto

> Documento de retomada. Leia isso primeiro quando voltar a trabalhar.
> **Data da última sessão:** 2026-05-15
> **Repositório:** https://github.com/andrensaraiva/SistemaProgramacaoJogos

## TL;DR — o que fazer agora

Fase 2 está concluída e testada. Pra retomar do zero (em outra máquina ou após formatar):

1. Clone o repo e instale deps:
   ```powershell
   git clone https://github.com/andrensaraiva/SistemaProgramacaoJogos.git
   cd SistemaProgramacaoJogos\web
   npm install
   ```
2. Configure Supabase + `.env.local` + seed (passos 1-5 abaixo, se for primeira vez)
3. Suba o **Piston em Docker** (passo 6 — necessário pra rodar código C#)
4. Continue a **Fase 3** do [PLANO.md](PLANO.md) — CRUD de turmas, invite code, atribuir listas a turmas.

---

## Onde paramos

A **Fase 2 (exercício rodando no navegador)** está completa, commitada e testada ponta a ponta:
- Lista de exercícios em `/exercicios` (3 públicos via seed)
- Página de resolução com Monaco Editor lazy-loaded
- Botão "Testar" → `/api/run` → Piston self-hosted
- Botão "Enviar" → Server Action roda todos os casos (incl. ocultos), persiste em `submissions`, dá XP/level
- Validado: "Olá, Mundo!" → +10 XP no painel ✅

E a **Fase 1 (autenticação)** já estava completa antes:
- Login / Cadastro / Logout via Supabase Auth (com Server Actions)
- Proteção de rotas via [proxy.ts](../web/proxy.ts)
- Validação de formulários com Zod, mensagens em PT-BR
- Tema customizado com paleta e dark mode

Veja o snapshot completo em [STATUS.md](STATUS.md).

## Setup do zero (só se for outra máquina)

Se você está no mesmo PC onde já fez tudo, pula essa seção. Pra setup novo:

### 1. Supabase (uma vez)
- Cria projeto em https://supabase.com/dashboard (região `sa-east-1`, free)
- SQL Editor → roda [supabase/migrations/0001_init.sql](../supabase/migrations/0001_init.sql)
- SQL Editor → roda [supabase/seed/0001_exercises.sql](../supabase/seed/0001_exercises.sql) (depois de cadastrar 1 perfil)
- Authentication → Email Provider: **Enable** ON, **Confirm email** OFF
- Settings → API: copia URL, anon, service_role

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

Confirma que `csharp.net` está em `http://localhost:2000/api/v2/runtimes`.

### 4. Subir o app
```powershell
cd web
npm install
npm run dev
```

---

## O que vem depois (próxima fase)

### Fase 3 — Gestão de turmas (próxima)
- CRUD de turmas pro professor (criar, listar, deletar)
- Página de invite code pro aluno entrar na turma
- CRUD de assignments (listas/desafios/provas) atribuídos a turmas
- Visão de progresso pro professor (quem fez o quê, quando, status)

**Arquivos esperados a criar:**
- `web/src/app/(app)/turmas/page.tsx` (lista de turmas)
- `web/src/app/(app)/turmas/nova/page.tsx` (criar turma — só professor)
- `web/src/app/(app)/turmas/[id]/page.tsx` (detalhe + alunos + assignments)
- `web/src/app/(app)/turmas/entrar/page.tsx` (aluno cola invite code)
- `web/src/lib/classes/actions.ts` (Server Actions: createClass, joinClass, etc.)

### Fase 4 — Gamificação
- Trigger no DB pra dar XP automaticamente quando submission é aprovada (hoje é manual no Server Action — precisa migrar)
- Distribuir badges automaticamente
- Ranking da turma + ranking global

### Fase 5+ — Antifraude, IA, X1, Unity, Polimento
Roteiro completo em [PLANO.md](PLANO.md).

---

## Como invocar a próxima sessão

Quando você reabrir o Claude Code nessa pasta, sugiro mandar uma mensagem assim:

> "Continuando o projeto. Fase 2 (Monaco + Piston self-hosted) já roda ponta a ponta. Bora pra Fase 3: gestão de turmas (CRUD + invite code + atribuir listas)."

Aí eu já tenho contexto pra continuar de onde parei.

Se você ficou travado em alguma das tarefas pendentes, manda o erro e eu te ajudo.

---

## Comandos úteis

```powershell
# Rodar dev server
cd web; npm run dev

# Type-check
cd web; npx tsc --noEmit

# Lint
cd web; npm run lint

# Build de produção (testar antes de deploy)
cd web; npm run build

# Atualizar deps
cd web; npm outdated
cd web; npm update

# Ver status do git
git status

# Ver logs
git log --oneline
```

---

## Estrutura atual de pastas

```
SistemaJogosProgramcao/
├── README.md                 # Visão geral pública
├── .gitignore
├── docs/
│   ├── PLANO.md              # Roteiro de desenvolvimento (9 fases)
│   ├── SETUP.md              # Como configurar do zero
│   ├── STATUS.md             # Snapshot atual (atualizado a cada mudança)
│   └── CONTINUAR.md          # Este arquivo
├── supabase/
│   ├── README.md
│   └── migrations/
│       └── 0001_init.sql     # Esquema completo (11 tabelas + RLS)
└── web/                      # Aplicação Next.js
    ├── package.json
    ├── proxy.ts              # Proxy global (auth + redirects)
    ├── .env.example          # Template de variáveis (commitado)
    ├── .env.local            # ⚠️ você precisa criar (NÃO commitar)
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx              # Landing pública
        │   ├── (auth)/               # Grupo de rotas de auth
        │   │   ├── layout.tsx
        │   │   ├── entrar/
        │   │   └── cadastrar/
        │   └── (app)/                # Grupo de rotas autenticadas
        │       ├── layout.tsx        # Header com nav e logout
        │       └── painel/
        │           └── page.tsx
        ├── components/
        │   ├── logo.tsx
        │   └── ui/
        │       ├── button.tsx
        │       └── input.tsx
        └── lib/
            ├── auth/
            │   ├── actions.ts        # Server Actions (login/signup/logout)
            │   └── dal.ts            # Data Access Layer (verifySession, getProfile)
            └── supabase/
                ├── client.ts         # Browser client
                ├── server.ts         # Server client
                └── middleware.ts     # Helper do proxy
```

# Como continuar o projeto

> Documento de retomada. Leia isso primeiro quando voltar a trabalhar.
> **Data da última sessão:** 2026-05-16
> **Repositório:** https://github.com/andrensaraiva/SistemaProgramacaoJogos

## TL;DR — o que fazer agora

1. Clone o repo e instale deps:
   ```powershell
   git clone https://github.com/andrensaraiva/SistemaProgramacaoJogos.git
   cd SistemaProgramacaoJogos\web
   npm install
   ```
2. Configure o Supabase (veja **Tarefas pendentes** abaixo). Sem isso, nada roda.
3. Continue a **Fase 2** — implementar a página de exercício com Monaco + Piston.

---

## Onde paramos

As **Fases 1 e 3** estão completas e commitadas. O que já funciona:

**Fase 1 — Autenticação:**
- Login / Cadastro / Logout via Supabase Auth com Server Actions
- Proteção de rotas via proxy global
- Diferenciação de papéis: `aluno` vs `professor`
- Tema customizado com paleta de cores e dark mode

**Fase 3 — Gestão de turmas:**
- Professor: criar, editar, excluir turmas; criar e excluir listas de exercícios
- Aluno: entrar em turma com código de convite de 8 chars; sair da turma
- Página de turma com código de convite copiável e lista de membros (professor)
- Visão de progresso: professor vê tabela alunos × exercícios; aluno vê próprio status

> **Nota:** A Fase 3 foi implementada antes da Fase 2 intencionalmente. A tabela de progresso (`/turmas/[id]/listas/[lid]`) vai popular automaticamente quando a Fase 2 (exercícios + submissões) estiver pronta.

---

## ⚠️ Tarefas pendentes do usuário (bloqueantes)

Sem fazer essas, o login não vai funcionar.

### 1️⃣ Criar projeto no Supabase

1. Vá em https://supabase.com/dashboard
2. Clique em **New project**
3. Preencha:
   - **Name:** `sistema-jogos-programacao`
   - **Database Password:** senha forte (anote!)
   - **Region:** South America (São Paulo) — `sa-east-1`
4. Espere ~2 minutos o projeto subir

### 2️⃣ Aplicar a migration do banco

1. No projeto, abra **SQL Editor** → **+ New query**
2. Copie o conteúdo de [supabase/migrations/0001_init.sql](../supabase/migrations/0001_init.sql)
3. Cole no editor e clique **Run**
4. Confirme: **Success. No rows returned** + 11 tabelas visíveis no Table Editor

### 3️⃣ Criar `.env.local`

1. No Supabase, vá em **Settings → API**
2. Copie:
   - **Project URL** (tipo `https://xxxxx.supabase.co`)
   - **`anon` `public`** key (começa com `eyJ...`)
   - **`service_role`** key (começa com `eyJ...` — **SECRETA, nunca commite**)
3. Crie `web/.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   GEMINI_API_KEY=
   PISTON_API_URL=https://emkc.org/api/v2/piston
   ```

### 4️⃣ Desabilitar confirmação de e-mail (só dev)

Em **Authentication → Sign In / Up → Email**, desmarque **Confirm email**. Facilita o cadastro durante os testes locais.

### 5️⃣ Testar

```powershell
cd web
npm run dev
```

Abra http://localhost:3000 — crie uma conta como **Professor**, depois outra como **Aluno** (navegador anônimo), e teste o fluxo de turmas.

---

## O que vem depois — Fase 2 (próxima)

O ❤️ da plataforma: resolver exercícios de programação no navegador.

**Arquivos a criar:**

```
web/src/
├── app/
│   ├── (app)/
│   │   └── exercicios/
│   │       ├── page.tsx              # Lista de exercícios
│   │       └── [id]/
│   │           ├── page.tsx          # Página de resolver (Server)
│   │           └── _editor.tsx       # Monaco Editor (Client Component)
│   └── api/
│       └── run/
│           └── route.ts              # POST → Piston API → stdout/stderr
└── lib/
    └── exercises/
        ├── actions.ts                # Server Actions: submeter, criar exercício
        └── judge.ts                  # Comparar stdout esperado vs obtido
```

**Fluxo esperado:**
1. Professor cria exercício com título, descrição, código inicial, casos de teste (stdin → stdout esperado)
2. Aluno abre `/exercicios/[id]`, edita no Monaco, clica "Executar" → vê stdout imediato (sem salvar)
3. Clica "Enviar" → todos os casos de teste rodam, salva `submission` no banco
4. Se todos passam: status `aprovado`, aluno ganha XP
5. `/turmas/[id]/listas/[lid]` já está pronto pra exibir o progresso

**Como invocar a próxima sessão:**
> "Fase 1 e 3 estão prontas e o Supabase está configurado. Bora implementar a Fase 2: página de exercício com Monaco Editor, API route `/api/run` com Piston, e sistema de casos de teste."

---

## Comandos úteis

```powershell
# Dev server
cd web; npm run dev

# Type-check (sem build)
cd web; npx tsc --noEmit

# Lint
cd web; npm run lint

# Build de produção
cd web; npm run build

# Git
git status
git log --oneline
```

---

## Estrutura atual de pastas

```
SistemaJogosProgramacao/
├── README.md
├── .gitignore
├── docs/
│   ├── PLANO.md              # Roteiro das 9 fases
│   ├── SETUP.md              # Configurar do zero
│   ├── STATUS.md             # Snapshot atual
│   └── CONTINUAR.md          # Este arquivo
├── supabase/
│   └── migrations/
│       └── 0001_init.sql     # 11 tabelas + RLS + seed
└── web/                      # Next.js 16
    ├── package.json
    ├── proxy.ts              # Proteção global de rotas
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx                      # Landing pública
        │   ├── (auth)/
        │   │   ├── entrar/                   # Login
        │   │   └── cadastrar/                # Cadastro (aluno/professor)
        │   └── (app)/                        # Rotas autenticadas
        │       ├── layout.tsx                # Header + nav + logout
        │       ├── painel/                   # Dashboard
        │       └── turmas/                   # ← FASE 3
        │           ├── page.tsx              # Lista de turmas
        │           ├── nova/                 # Criar turma (professor)
        │           ├── entrar/               # Entrar com código (aluno)
        │           └── [id]/
        │               ├── page.tsx          # Detalhe: membros, listas, convite
        │               ├── editar/           # Editar turma
        │               └── listas/
        │                   ├── nova/         # Criar lista
        │                   └── [lid]/        # Progresso: alunos × exercícios
        ├── components/
        │   ├── logo.tsx
        │   ├── confirm-form.tsx              # Client wrapper para confirm()
        │   └── ui/
        │       ├── button.tsx
        │       └── input.tsx
        └── lib/
            ├── auth/
            │   ├── actions.ts               # login, signup, logout
            │   └── dal.ts                   # verifySession, getProfile, isProfessor
            ├── turmas/
            │   └── actions.ts               # ← FASE 3: 7 server actions
            └── supabase/
                ├── client.ts
                ├── server.ts
                └── middleware.ts
```

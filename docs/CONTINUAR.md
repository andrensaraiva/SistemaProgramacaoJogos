# Como continuar o projeto

> Documento de retomada. Leia isso primeiro quando voltar a trabalhar.
> **Data da última sessão:** 2026-05-15
> **Repositório:** https://github.com/andrensaraiva/SistemaProgramacaoJogos

## TL;DR — o que fazer agora

1. Clone o repo e instale deps:
   ```powershell
   git clone https://github.com/andrensaraiva/SistemaProgramacaoJogos.git
   cd SistemaProgramacaoJogos\web
   npm install
   ```
2. Faça as **3 tarefas pendentes do usuário** (abaixo). Sem elas, nada roda.
3. Continue a **Fase 2** do [PLANO.md](PLANO.md) — implementar a página de exercício com Monaco + Piston.

---

## Onde paramos

A **Fase 1 (autenticação)** está completa e commitada. Funciona ponta a ponta:
- Login / Cadastro / Logout via Supabase Auth (com Server Actions)
- Proteção de rotas via [proxy.ts](../web/proxy.ts)
- Validação de formulários com Zod e mensagens em PT-BR
- Tema customizado com paleta de cores e dark mode

Veja o snapshot completo em [STATUS.md](STATUS.md).

## ⚠️ Tarefas pendentes do usuário (bloqueantes)

Sem fazer essas, **nada roda**. Mesmo eu (IA) não consigo fazer no seu lugar — precisa de cliques na sua conta.

### 1️⃣ Criar projeto no Supabase

1. Vá em https://supabase.com/dashboard
2. Clique em **New project**
3. Preencha:
   - **Name:** `sistema-jogos-programacao`
   - **Database Password:** (escolha uma senha forte, **anote em local seguro** — você vai precisar pra acessar o DB direto)
   - **Region:** South America (São Paulo) — `sa-east-1`
   - **Pricing Plan:** Free
4. Clique em **Create new project**
5. Espere ~2 minutos o projeto subir (o painel mostra um loader)

### 2️⃣ Aplicar a migration do banco

1. No projeto recém-criado, abra **SQL Editor** (ícone de `<>` no menu lateral)
2. Clique em **+ New query**
3. Abra o arquivo [supabase/migrations/0001_init.sql](../supabase/migrations/0001_init.sql) localmente
4. Copie **todo o conteúdo** e cole no SQL Editor
5. Clique em **Run** (ou Ctrl+Enter)
6. Confira: deve dizer **Success. No rows returned** e nas tabelas (menu **Table Editor** lateral) você deve ver as 11 tabelas: `profiles`, `classes`, `class_members`, `exercises`, `exercise_tests`, `assignments`, `assignment_exercises`, `submissions`, `badges`, `user_badges`, `duels`

### 3️⃣ Pegar as 3 keys e criar `.env.local`

1. No Supabase, vá em **Settings → API** (ícone de engrenagem no menu lateral)
2. Copie 3 valores:
   - **Project URL** (algo tipo `https://xxxxx.supabase.co`)
   - **`anon` `public`** key (chave longa começando com `eyJ...`)
   - **`service_role`** key (outra chave longa, **ESSA É SECRETA — nunca compartilhe nem commite**)
3. (Opcional para Fase 6) Pegue uma key do Gemini em https://aistudio.google.com/app/apikey → **Create API key**
4. Crie um arquivo `.env.local` em `web/` (mesma pasta do `package.json`):

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   GEMINI_API_KEY=
   PISTON_API_URL=https://emkc.org/api/v2/piston
   ```

5. **NUNCA commite esse arquivo** — ele já está no `.gitignore`.

### 4️⃣ Configurar Auth no Supabase (importante!)

Por padrão, o Supabase exige **confirmação de e-mail** antes do usuário conseguir entrar. Pra desenvolvimento, vamos desligar isso (depois você liga em produção).

1. Em **Authentication → Sign In / Up → Email**
2. Desmarque **Confirm email** (ou marque se quiser, mas terá que confirmar via inbox a cada teste)
3. Salve

### 5️⃣ Testar localmente

```powershell
cd web
npm run dev
```

Abra http://localhost:3000 — você deve ver a landing page. Clique em **Criar conta**, cadastre-se como **Professor**, faça login, deve cair no `/painel`.

Se der erro:
- **"Invalid URL"** ou similar → falta `.env.local` ou as keys estão erradas
- **Auth user mas sem profile** → a migration não rodou ou rodou pela metade. Volte ao SQL Editor e rode de novo
- **Outros erros** → cole o erro no console do navegador (F12) na próxima sessão pra eu debugar

---

## O que vem depois (próximas fases)

Veja o [PLANO.md](PLANO.md) inteiro. Resumo das próximas 3 fases:

### Fase 2 — Exercício rodando no navegador (próxima)
Construir o ❤️ da plataforma:
- `/exercicios` — lista de exercícios
- `/exercicios/[id]` — página com Monaco Editor (já instalado, `@monaco-editor/react`)
- API route `/api/run` — recebe código do aluno, manda pra **Piston API**, devolve stdout/stderr
- Sistema de casos de teste (já tem na tabela `exercise_tests`)
- Submissão: roda todos os casos, persiste em `submissions`, dá XP se passar

**Arquivos esperados a criar:**
- `web/src/app/(app)/exercicios/page.tsx` (lista)
- `web/src/app/(app)/exercicios/[id]/page.tsx` (resolver)
- `web/src/app/(app)/exercicios/[id]/_editor.tsx` (Monaco — client component)
- `web/src/app/api/run/route.ts` (POST → Piston)
- `web/src/lib/exercises/judge.ts` (lógica de comparação stdout esperado vs obtido)

### Fase 3 — Gestão de turmas
- CRUD de turmas pro professor
- Aluno entra com invite code
- Atribuir listas a turmas

### Fase 4 — Gamificação
- Trigger no DB pra dar XP automaticamente quando submission é aprovada
- Subir de nível (regra: 100 XP × nível)
- Distribuir badges automaticamente

---

## Como invocar a próxima sessão

Quando você reabrir o Claude Code nessa pasta, sugiro mandar uma mensagem assim:

> "Continuei o projeto. Já fiz as tarefas do CONTINUAR.md (criei o Supabase, apliquei a migration, configurei o .env.local, o login funciona). Bora pra Fase 2: página de exercício com Monaco + Piston."

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

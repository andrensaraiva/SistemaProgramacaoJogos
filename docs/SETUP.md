# Setup do ambiente

Passo a passo para colocar a plataforma rodando do zero.

## Pré-requisitos
- **Node.js 20+** (você tem 22 ✅)
- **Git** (você tem ✅)
- **.NET 9 SDK** (só pra rodar testes dos templates de C# localmente — você tem ✅)
- Contas: GitHub, Vercel, Supabase, Google AI Studio

## 1. Criar projeto no Supabase

1. Acesse https://supabase.com/dashboard
2. **New project** → nome: `sistema-jogos-programacao` → região: South America (São Paulo) → defina senha do banco (anote)
3. Espere ~2 min o projeto subir
4. Em **Settings → API**, copie:
   - `Project URL`
   - `anon public` key
   - `service_role` key (só usar no servidor, nunca no client)

## 2. Variáveis de ambiente

Na raiz de `web/`, crie um arquivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# Gemini (https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=sua-key-do-gemini

# Piston API (pública, não precisa de key)
PISTON_API_URL=https://emkc.org/api/v2/piston

# GitHub OAuth (opcional, pra integrar com Classroom)
# GITHUB_CLIENT_ID=
# GITHUB_CLIENT_SECRET=
```

## 3. Aplicar o esquema do banco

No SQL Editor do Supabase, copie e execute o conteúdo de [supabase/migrations/0001_init.sql](../supabase/migrations/0001_init.sql).

## 4. Rodar localmente

```powershell
cd web
npm install
npm run dev
```

Abrir http://localhost:3000.

## 5. Deploy na Vercel

1. Suba este projeto pro GitHub
2. Em https://vercel.com/new, importe o repositório
3. Em **Root Directory**, defina `web`
4. Em **Environment Variables**, copie as do `.env.local` (todas, inclusive as `NEXT_PUBLIC_*`)
5. Deploy. Vai te dar uma URL `*.vercel.app` que você pode compartilhar com os alunos.

## 6. Frente Unity (GitHub Classroom)

Veja [GITHUB_CLASSROOM.md](GITHUB_CLASSROOM.md) (será criado quando chegarmos na Fase 8).

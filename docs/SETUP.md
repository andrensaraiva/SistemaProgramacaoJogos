# Setup do ambiente

Passo a passo para colocar a plataforma rodando do zero.

## Pré-requisitos
- **Node.js 20+** (você tem 22 ✅)
- **Git** (você tem ✅)
- **.NET 9 SDK** (só pra rodar testes dos templates de C# localmente — você tem ✅)
- **Docker Desktop** (pra rodar o Piston localmente — execução de código C# dos alunos)
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

# Piston self-hosted (ver passo 4)
PISTON_API_URL=http://localhost:2000/api/v2

# GitHub OAuth (opcional, pra integrar com Classroom)
# GITHUB_CLIENT_ID=
# GITHUB_CLIENT_SECRET=
```

## 3. Aplicar o esquema do banco

No SQL Editor do Supabase:
1. Cole e execute [supabase/migrations/0001_init.sql](../supabase/migrations/0001_init.sql) (cria 11 tabelas + RLS)
2. Cole e execute [supabase/seed/0001_exercises.sql](../supabase/seed/0001_exercises.sql) (3 exercícios C# de exemplo — rode depois de cadastrar pelo menos um perfil)

## 4. Subir o Piston (execução de código)

A API pública do Piston em emkc.org virou whitelist-only em 15/02/2026. Rodamos nosso próprio em Docker:

```powershell
# Criar volume nomeado e subir o container (sobe sozinho quando o Docker reiniciar)
docker volume create piston_data
docker run -d --name piston_api --privileged --restart unless-stopped `
  -v piston_data:/piston -p 2000:2000 ghcr.io/engineer-man/piston:latest

# Instalar o pacote dotnet (única vez — fica no volume)
$body = '{"language":"dotnet","version":"5.0.201"}'
Invoke-RestMethod -Uri "http://localhost:2000/api/v2/packages" -Method Post `
  -ContentType "application/json" -Body $body
```

Confirma que `csharp.net` aparece em `http://localhost:2000/api/v2/runtimes`.

## 5. Rodar localmente

```powershell
cd web
npm install
npm run dev
```

Abrir http://localhost:3000.

## 6. Deploy na Vercel

1. Suba este projeto pro GitHub
2. Em https://vercel.com/new, importe o repositório
3. Em **Root Directory**, defina `web`
4. Em **Environment Variables**, copie as do `.env.local` (todas, inclusive as `NEXT_PUBLIC_*`)
5. ⚠️ Pra produção, o `PISTON_API_URL=http://localhost:2000/api/v2` não funciona — Vercel não roda Docker. Você vai precisar hospedar o Piston em outro lugar (Fly.io, Railway, VPS) e apontar pra URL pública. Decisão pra Fase 9.
6. Deploy. Vai te dar uma URL `*.vercel.app` que você pode compartilhar com os alunos.

## 7. Frente Unity (GitHub Classroom)

Veja [GITHUB_CLASSROOM.md](GITHUB_CLASSROOM.md) (será criado quando chegarmos na Fase 8).

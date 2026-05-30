# Setup do ambiente

> 📌 **O guia completo e atualizado é o [SETUP_COMPLETO_PASSO_A_PASSO.md](SETUP_COMPLETO_PASSO_A_PASSO.md).**
> Use-o para configurar tudo do zero. Este arquivo permanece como referência
> rápida das partes que não mudam (Supabase, Piston, Vercel, Unity).

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
GITHUB_PERSONAL_ACCESS_TOKEN=
```

## 3. Aplicar o esquema do banco

No SQL Editor do Supabase, cole e execute **o arquivo único**
[supabase/SETUP_COMPLETO.sql](../supabase/SETUP_COMPLETO.sql). Ele faz reset +
cria todo o schema (todas as fases, incluindo a camada curricular) + seed base de
badges/linguagens em uma só execução.

Depois rode o seed demo (passo 5) para criar usuários, turma, exercícios e o curso
técnico de exemplo.

> Banco já existente e você só quer a novidade do currículo sem apagar nada? Rode
> apenas [supabase/migrations/0007_curriculum.sql](../supabase/migrations/0007_curriculum.sql)
> (aditivo e idempotente). As migrations `0001`…`0007` continuam no repositório
> como histórico; para um setup limpo prefira o `SETUP_COMPLETO.sql`.

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
npm run seed:demo:reset   # usuários demo + turma + exercícios + curso técnico
npm run dev
```

Abrir http://127.0.0.1:3000 (o dev sobe nesse host). Credenciais demo impressas
pelo seed: `prof.demo@codequest.dev` / `password123` (e `aluno1`/`aluno2`).

## 6. Deploy na Vercel

Checklist completo em [DEPLOY.md](DEPLOY.md).

1. Suba este projeto pro GitHub
2. Em https://vercel.com/new, importe o repositório
3. Em **Root Directory**, defina `web`
4. Em **Environment Variables**, copie as do `.env.local` (todas, inclusive as `NEXT_PUBLIC_*`)
5. ⚠️ Pra produção, o `PISTON_API_URL=http://localhost:2000/api/v2` não funciona — Vercel não roda Docker. Você vai precisar hospedar o Piston em outro lugar (Fly.io, Railway, VPS) e apontar pra URL pública. Decisão pra Fase 9.
6. Deploy. Vai te dar uma URL `*.vercel.app` que você pode compartilhar com os alunos.

## 7. Frente Unity (GitHub Classroom)

Abra `/unity` para ver os templates e `/unity/github` para sincronizar notas de
repositorios. Repositorios publicos funcionam sem token; para privados,
configure `GITHUB_PERSONAL_ACCESS_TOKEN` com permissao de leitura de Actions.

Veja [GITHUB_CLASSROOM.md](GITHUB_CLASSROOM.md) (será criado quando chegarmos na Fase 8).

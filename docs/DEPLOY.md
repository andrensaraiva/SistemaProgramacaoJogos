# Deploy na Vercel

Checklist para publicar a plataforma.

## 1. Banco

No Supabase SQL Editor, rode nesta ordem:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_gamification_repair_idempotent.sql`
3. `supabase/migrations/0003_ai_cache.sql`
4. `supabase/migrations/0004_duel_elo_github.sql`
5. `supabase/seed/0001_exercises.sql`

Em Authentication > Providers > Email, deixe cadastro por email habilitado. Para
testes de aula, pode desligar confirmacao de email.

## 2. Piston publico

A Vercel nao executa Docker. Antes do deploy final, hospede o Piston fora dela
e configure `PISTON_API_URL` com uma URL publica terminando em `/api/v2`.

Exemplo:

```env
PISTON_API_URL=https://piston-sua-escola.fly.dev/api/v2
```

Depois de subir o Piston, instale o runtime `dotnet` nele:

```powershell
$body = '{"language":"dotnet","version":"5.0.201"}'
Invoke-RestMethod -Uri "https://SEU-PISTON/api/v2/packages" -Method Post `
  -ContentType "application/json" -Body $body
```

## 3. Vercel

1. Importe o repositorio em https://vercel.com/new.
2. Em `Root Directory`, selecione `web`.
3. Framework preset: `Next.js`.
4. Build command: `npm run build`.
5. Install command: `npm install`.
6. Output directory: deixe vazio.

## 4. Variaveis

Use `web/.env.example` como referencia e preencha estes valores na tela
Environment Variables da Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PISTON_API_URL=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
GITHUB_PERSONAL_ACCESS_TOKEN=
```

`GEMINI_API_KEY` e `GITHUB_PERSONAL_ACCESS_TOKEN` sao opcionais se voce nao for
usar IA ou repositorios privados.

## 5. Validacao

Antes de publicar:

```powershell
cd web
npm run verify
```

Depois do deploy, abra:

```text
https://SEU-DOMINIO.vercel.app/api/health
```

O campo `ok` deve estar `true`. Se `pistonLooksPublic` estiver `false`, a
plataforma abre, mas execucao de codigo dos alunos nao funcionara em producao.

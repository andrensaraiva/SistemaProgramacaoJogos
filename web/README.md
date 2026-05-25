# Web

App Next.js da plataforma Sistema Jogos Programacao.

## Desenvolvimento

```powershell
npm install
npm run dev
```

Abra `http://127.0.0.1:3000`.

## Verificacao

```powershell
npm run verify
```

Esse comando roda typecheck, lint e build de producao.

## Deploy

Na Vercel, use:

- Root Directory: `web`
- Framework: `Next.js`
- Build Command: `npm run build`
- Install Command: `npm install`

Configure as variaveis de `web/.env.production.example`. Depois do deploy,
valide `https://SEU-DOMINIO.vercel.app/api/health`.

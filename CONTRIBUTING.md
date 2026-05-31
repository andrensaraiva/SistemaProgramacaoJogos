# Como contribuir

Guia para você (ou um colega) tocar o projeto via git, usando a IA que preferir
(Claude, ChatGPT, Copilot, etc.).

## Antes de começar (uma vez)
1. Leia, nesta ordem: [README.md](README.md) → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) → [docs/SETUP_COMPLETO_PASSO_A_PASSO.md](docs/SETUP_COMPLETO_PASSO_A_PASSO.md).
2. **⚠️ [web/AGENTS.md](web/AGENTS.md)**: este é Next.js 16, com mudanças em relação ao que as IAs "lembram". Ao usar uma IA, peça para ela conferir `web/node_modules/next/dist/docs/` antes de usar API nova do Next.
3. Configure o ambiente (Supabase, `.env.local`, Piston Docker) e rode `npm run seed:demo:reset`.

## Rodar e verificar
```bash
cd web
npm install
npm run dev          # http://127.0.0.1:3000
npm run verify       # tsc + lint + build — RODE ANTES DE COMMITAR
```

## Padrões do código (siga ao escrever ou pedir à IA)

**Server Action** (`lib/<modulo>/actions.ts`):
```ts
"use server";
export async function minhaAction(classId: string, formData: FormData) {
  const { user } = await verifySession();
  if (!(await isProfessor())) return { ok: false, message: "Apenas professores." };
  // verifique posse no código (ex.: dono da turma) antes de escrever
  const admin = createAdminClient();
  // ... insert/update ...
  revalidatePath(`/turmas/${classId}`);
  return { ok: true };
}
```
- Validação com `zod`; retorno `{ ok: true } | { ok: false, message }` (ou `useActionState`).
- Leitura nas páginas com `createClient()` (respeita RLS); escrita com `createAdminClient()` (verifique posse).
- **Selects do Supabase em UMA linha** (string multilinha quebra a inferência de tipos).

**RLS / migrations**:
- Toda policy que cruza tabelas usa funções `SECURITY DEFINER` (ver ARCHITECTURE). Nunca consulte uma tabela com RLS dentro da policy de outra.
- Nova mudança de banco: `supabase/migrations/<timestamp>_nome.sql` + reflita no `supabase/SETUP_COMPLETO.sql`; aplique com `npx supabase db push`.

**UI**:
- Use o kit em `components/ui/` (Card, PageHeader, StatCard, StatusBadge, Table, charts). PT-BR nos textos.
- Client components com prefixo `_` e `"use client"`.

## Commits e branches
- Mensagens em PT-BR, no imperativo, com prefixo `feat:`/`fix:`/`docs:`/`chore:` e um corpo curto explicando o porquê.
- Trabalhe em branch e abra PR para `main` (ou commite direto em `main` se for o mantenedor solo — o histórico atual usa as duas formas).
- Rode `npm run verify` antes de cada commit.

## Onde mexer (mapa rápido)
| Quero… | Vá em… |
|---|---|
| Mudar o banco | `supabase/migrations/` + `supabase/SETUP_COMPLETO.sql` |
| Nova tela | `web/src/app/(app)/<feature>/` |
| Lógica de servidor | `web/src/lib/<modulo>/actions.ts` |
| Estilo/visual | `web/src/components/ui/` e `web/src/app/globals.css` |
| Dados de teste | `web/scripts/seed-demo.mjs` |

## Backlog e prioridades
Veja [docs/ROADMAP.md](docs/ROADMAP.md) (o que está feito + ideias por papel) e
[docs/UI_UX.md](docs/UI_UX.md) (diretrizes visuais e telas a migrar).

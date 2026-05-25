# Seed demo resetavel

Este seed e aplicado pelo script:

```powershell
cd web
npm run seed:demo
```

Ele recria dados demo no Supabase usando `web/.env.local`:

- Professor: `prof.demo@codequest.dev` / `password123`
- Aluno 1: `aluno1.demo@codequest.dev` / `password123`
- Aluno 2: `aluno2.demo@codequest.dev` / `password123`
- Turma: `Turma Demo`
- Codigo de convite: `DEMO2026`
- Lista: `Lista Demo`
- Exercicios: `Demo: Ola Mundo`, `Demo: Soma`, `Demo: Par ou Impar`

Para resetar tambem os usuarios demo no Supabase Auth:

```powershell
cd web
npm run seed:demo:reset
```

O reset apaga somente os dados demo identificados pelo codigo `DEMO2026`,
pelos titulos `Demo:*` e pelos e-mails acima. Ele nao apaga dados reais.

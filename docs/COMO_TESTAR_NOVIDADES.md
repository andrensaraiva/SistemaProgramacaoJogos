# Como testar as novidades

Guia das funcionalidades novas (linguagens dinâmicas, correção do professor,
tutor de IA e UX estilo Canvas). Para o fluxo antigo completo, veja
[TEST_FLOW.md](TEST_FLOW.md).

## 1. Resetar o banco e recriar dados demo

> ⚠️ Isso **apaga** os dados do app. Os usuários de login só são recriados no passo 2.

**Passo 1 — Schema (Supabase SQL Editor):**
Abra o SQL Editor do seu projeto Supabase e rode o arquivo inteiro:

```
supabase/SETUP_COMPLETO.sql
```

No final ele mostra uma linha de verificação (linguagens ativas, badges,
`correcao_manual_ok`, `language_id_ok`) — todos devem estar OK/true.

**Passo 2 — Usuários + dados demo (terminal):**

```powershell
cd web
npm run seed:demo:reset
```

Contas criadas:

```
Professor: prof.demo@codequest.dev / password123
Aluno 1:   aluno1.demo@codequest.dev / password123
Aluno 2:   aluno2.demo@codequest.dev / password123
Turma:     DEMO2026
```

**Passo 3 — Subir o app (e o Piston):**

```powershell
cd web
npm run dev
```

Garanta que o container do Piston está rodando em `localhost:2000` (a var
`PISTON_API_URL` no `.env.local`). Sem ele, "Testar"/"Enviar" falham.

---

## 2. Linguagens dinâmicas ✅

O seed agora cria um exercício **em Python** ("Demo: Soma em Python") além dos de C#.

1. Entre como **Aluno 1**.
2. Vá em **Exercícios** → abra **Demo: Soma em Python**.
3. Confira: o cabeçalho mostra **Python** e o editor faz syntax highlight de Python.
4. Resolva (`print(a + b)`), clique **Testar** e depois **Enviar**.

> Para adicionar mais linguagens (C++, Java, TypeScript) basta criar exercícios
> com aquele `language_id` — a tabela `languages` já tem todas habilitadas.
> Arduino aparece como **planejado/desabilitado** (ver `docs/ARDUINO_PLANO.md`).

---

## 3. Tutor de IA no editor 💡 (free-tier)

Precisa de `GEMINI_API_KEY` no `.env.local`.

1. Como **Aluno 1**, abra qualquer exercício.
2. Escreva um código **errado** de propósito e clique **Testar** (ou **Enviar**).
3. No painel **Tutor IA**, clique:
   - **💡 Dica** → dá uma dica conceitual, **sem** entregar a resposta.
   - **🔍 Explicar erro** → explica o que está dando errado, **sem** reescrever seu código.
4. Note também o **autocomplete melhorado** do editor (sugestões ao digitar).

---

## 4. Correção do professor (estilo SpeedGrader) ✍️

O seed já deixa uma submissão do Aluno 1 **aprovada e com nota 10 + feedback**.

**Como professor:**
1. Entre como **prof.demo@codequest.dev**.
2. **Turmas** → **Turma Demo** → abra a lista **Lista Demo**.
3. Você vê a grade aluno × exercício. A célula do Aluno 1 no 1º exercício mostra
   um selo **10** (nota manual).
4. **Clique na célula** → abre a tela de **Correção**: código do aluno (somente
   leitura), resultado dos testes, e o formulário de **nota (0–10) + feedback**.
5. Mude a nota/feedback e **Salvar correção**.

**Como aluno (ver o retorno):**
1. Entre como **Aluno 1**.
2. **Turmas** → **Turma Demo** → **Lista Demo**.
3. No 1º exercício aparece o selo **Nota 10** e o **Feedback do professor**.

---

## 5. UX estilo Canvas 🗂️

1. **Próximas entregas** (painel): a "Lista Demo" tem prazo daqui a 5 dias e
   aparece no widget **Próximas entregas** do painel, com contagem ("em 5 dias").
   Funciona para aluno e professor.
2. **Trilha (breadcrumbs):** na tela de correção, no topo aparece
   `Turmas › Turma Demo › Lista Demo › Corrigir · Aluno`.

---

## 6. Checklist rápido de regressão

```powershell
cd web
npm run verify   # typecheck + lint + build
```

Tudo deve passar (verificado nesta entrega).

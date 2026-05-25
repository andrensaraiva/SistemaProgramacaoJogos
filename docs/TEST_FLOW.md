# Fluxo de teste completo

Use este roteiro depois de aplicar as migrations e recriar o seed demo.

## 1. Preparar banco e seed

No SQL Editor do Supabase, rode:

1. `supabase/migrations/0001_init.sql` apenas se o banco estiver vazio.
2. `supabase/migrations/0002_gamification_repair_idempotent.sql`
3. `supabase/migrations/0003_ai_cache.sql`
4. `supabase/migrations/0004_duel_elo_github.sql`

No terminal:

```powershell
cd web
npm run seed:demo:reset
npm run dev
```

## 2. Contas demo

```text
Professor: prof.demo@codequest.dev / password123
Aluno 1:   aluno1.demo@codequest.dev / password123
Aluno 2:   aluno2.demo@codequest.dev / password123
Turma:     DEMO2026
```

## 3. Fluxo do aluno

1. Entrar com `aluno1.demo@codequest.dev`.
2. Abrir `/painel`.
3. Confirmar que o tour de primeiro acesso aparece.
4. Clicar em `Pular` ou avancar ate o fim do tour.
5. Abrir `/turmas` e confirmar `Turma Demo`.
6. Abrir `/exercicios`.
7. Abrir `Demo: Ola Mundo`.
8. Clicar em `Testar` com codigo correto.
9. Clicar em `Enviar`.
10. Confirmar XP, badge `Primeira Vitoria` e ranking.

Codigo para `Demo: Ola Mundo`:

```csharp
using System;

class Program
{
    static void Main()
    {
        Console.WriteLine("Ola, Mundo!");
    }
}
```

## 4. Antifraude

1. Entrar como `aluno2.demo@codequest.dev`.
2. Abrir o mesmo exercicio.
3. Colar o codigo no editor.
4. Enviar.
5. Entrar como professor.
6. Abrir `Turma Demo` -> `Lista Demo`.
7. Confirmar alertas antifraude na tabela de progresso.

## 5. Duelos

1. Entrar como `aluno1.demo@codequest.dev`.
2. Abrir `/duelos`.
3. Criar duelo com `Demo: Ola Mundo`.
4. Copiar o codigo do duelo.
5. Entrar como `aluno2.demo@codequest.dev`.
6. Abrir `/duelos` e entrar com o codigo.
7. Um aluno resolve e envia o exercicio.
8. Voltar em `/duelos` e clicar `Atualizar vencedor`.
9. Confirmar que o duelo fica `Concluido` e mostra delta de ELO.
10. Confirmar que o ELO do vencedor subiu e o do perdedor caiu.

## 6. IA

Requisito: `GEMINI_API_KEY` no `web/.env.local`.

Professor:

1. Entrar como professor.
2. Abrir `/exercicios`.
3. Clicar `Gerar com IA`.
4. Pedir um exercicio simples, por exemplo:
   `Crie um exercicio sobre calcular dano de ataque em RPG`.
5. Confirmar que a pagina redireciona para o exercicio gerado.

Aluno:

1. Abrir qualquer exercicio.
2. Clicar `Gerar exercicio extra`.
3. Confirmar que um novo exercicio similar foi criado.

## 7. Unity/GitHub Classroom

1. Abrir `/unity`.
2. Conferir os templates:
   - `classroom-templates/csharp-basico`
   - `classroom-templates/unity-projeto`
3. Abrir `/unity/github`.
4. Informar um repositorio no formato `dono/repositorio`.
5. Clicar em `Sincronizar`.
6. Confirmar status, nota estimada, commit e link para o GitHub Actions.
7. Para C#, entrar no template e rodar:

```powershell
dotnet test
```

O teste deve passar com a implementacao de exemplo do template.

Para repositorios privados, configure `GITHUB_PERSONAL_ACCESS_TOKEN` no
`web/.env.local` com permissao de leitura de Actions.

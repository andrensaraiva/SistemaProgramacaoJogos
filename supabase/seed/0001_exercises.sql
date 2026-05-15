-- =============================================================================
-- Seed: 3 exercícios C# públicos pra testar a Fase 2
-- =============================================================================
-- Pré-requisito: você já precisa ter pelo menos 1 perfil cadastrado (qualquer
-- conta criada via /cadastrar serve). O script escolhe o primeiro professor
-- (ou, se não houver, o primeiro perfil) como autor.
--
-- Como aplicar: SQL Editor do Supabase → cole tudo → Run.
-- Idempotente: se rodar de novo, ignora os títulos que já existem.
-- =============================================================================

do $$
declare
  v_author_id uuid;
  v_ex1_id uuid;
  v_ex2_id uuid;
  v_ex3_id uuid;
begin
  -- Escolhe um autor: primeiro professor; se não houver, primeiro perfil
  select id into v_author_id from public.profiles
    where role in ('professor', 'admin')
    order by created_at asc
    limit 1;

  if v_author_id is null then
    select id into v_author_id from public.profiles
      order by created_at asc
      limit 1;
  end if;

  if v_author_id is null then
    raise exception 'Nenhum perfil encontrado. Cadastre-se primeiro em /cadastrar e rode esse seed depois.';
  end if;

  -- ---------------------------------------------------------------------------
  -- Exercício 1: Olá, Mundo!
  -- ---------------------------------------------------------------------------
  if not exists (select 1 from public.exercises where title = 'Olá, Mundo!') then
    insert into public.exercises (
      author_id, title, description, starter_code,
      language, difficulty, xp_reward, is_public
    ) values (
      v_author_id,
      'Olá, Mundo!',
      E'Sua primeira missão: imprima a mensagem **`Olá, Mundo!`** no console.\n\n' ||
      E'### Saída esperada\n```\nOlá, Mundo!\n```\n\n' ||
      E'**Dica:** use `Console.WriteLine(...)`.',
      E'using System;\n\nclass Program\n{\n    static void Main()\n    {\n        // escreva seu código aqui\n    }\n}\n',
      'csharp', 'facil', 10, true
    )
    returning id into v_ex1_id;

    insert into public.exercise_tests (exercise_id, ord, stdin, expected_stdout, is_hidden, weight) values
      (v_ex1_id, 1, '', E'Olá, Mundo!\n', false, 1);
  end if;

  -- ---------------------------------------------------------------------------
  -- Exercício 2: Soma de dois números
  -- ---------------------------------------------------------------------------
  if not exists (select 1 from public.exercises where title = 'Soma de dois números') then
    insert into public.exercises (
      author_id, title, description, starter_code,
      language, difficulty, xp_reward, is_public
    ) values (
      v_author_id,
      'Soma de dois números',
      E'Leia dois números inteiros do console (cada um numa linha) e imprima a soma.\n\n' ||
      E'### Exemplo\n**Entrada:**\n```\n3\n5\n```\n**Saída esperada:**\n```\n8\n```\n\n' ||
      E'**Dica:** use `int.Parse(Console.ReadLine())` pra ler cada número.',
      E'using System;\n\nclass Program\n{\n    static void Main()\n    {\n        // ler dois números, imprimir a soma\n    }\n}\n',
      'csharp', 'facil', 15, true
    )
    returning id into v_ex2_id;

    insert into public.exercise_tests (exercise_id, ord, stdin, expected_stdout, is_hidden, weight) values
      (v_ex2_id, 1, E'3\n5\n',       E'8\n',    false, 1),
      (v_ex2_id, 2, E'10\n20\n',     E'30\n',   false, 1),
      (v_ex2_id, 3, E'-5\n5\n',      E'0\n',    true,  1),  -- oculto
      (v_ex2_id, 4, E'1000\n2000\n', E'3000\n', true,  1);  -- oculto
  end if;

  -- ---------------------------------------------------------------------------
  -- Exercício 3: FizzBuzz
  -- ---------------------------------------------------------------------------
  if not exists (select 1 from public.exercises where title = 'FizzBuzz') then
    insert into public.exercises (
      author_id, title, description, starter_code,
      language, difficulty, xp_reward, is_public
    ) values (
      v_author_id,
      'FizzBuzz',
      E'Leia um número **N** do console e, para cada número de 1 até N, imprima:\n\n' ||
      E'- `Fizz` se divisível por 3\n- `Buzz` se divisível por 5\n' ||
      E'- `FizzBuzz` se divisível por ambos\n- O próprio número, caso contrário\n\n' ||
      E'Um valor por linha.\n\n' ||
      E'### Exemplo\n**Entrada:**\n```\n5\n```\n**Saída esperada:**\n```\n1\n2\nFizz\n4\nBuzz\n```',
      E'using System;\n\nclass Program\n{\n    static void Main()\n    {\n        int n = int.Parse(Console.ReadLine());\n        for (int i = 1; i <= n; i++)\n        {\n            // implementar\n        }\n    }\n}\n',
      'csharp', 'medio', 25, true
    )
    returning id into v_ex3_id;

    insert into public.exercise_tests (exercise_id, ord, stdin, expected_stdout, is_hidden, weight) values
      (v_ex3_id, 1, E'5\n',  E'1\n2\nFizz\n4\nBuzz\n', false, 1),
      (v_ex3_id, 2, E'15\n', E'1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n', false, 1),
      (v_ex3_id, 3, E'30\n', E'1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n16\n17\nFizz\n19\nBuzz\nFizz\n22\n23\nFizz\nBuzz\n26\nFizz\n28\n29\nFizzBuzz\n', true, 1);
  end if;
end $$;

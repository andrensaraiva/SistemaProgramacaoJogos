import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const ENV_PATH = resolve(ROOT, ".env.local");
const RESET_USERS = process.argv.includes("--reset-users");

const DEMO_PASSWORD = "password123";
const INVITE_CODE = "DEMO2026";

const USERS = [
  {
    email: "prof.demo@codequest.dev",
    personal_email: "prof.demo.pessoal@gmail.com",
    display_name: "Prof Demo",
    role: "professor",
  },
  {
    email: "prof2.demo@codequest.dev",
    personal_email: "prof2.demo.pessoal@gmail.com",
    display_name: "Prof Demo 2 (co-docência)",
    role: "professor",
  },
  {
    email: "aluno1.demo@codequest.dev",
    personal_email: "aluno1.pessoal@gmail.com",
    display_name: "Aluno Demo 1",
    role: "aluno",
  },
  {
    email: "aluno2.demo@codequest.dev",
    personal_email: "aluno2.pessoal@gmail.com",
    display_name: "Aluno Demo 2",
    role: "aluno",
  },
];

// Admin demo — para entrar no painel administrativo e ver os relatórios.
const ADMIN_PASSWORD = "Admin@2026";
const ADMIN_USER = {
  email: "admin@celeste.academy",
  display_name: "Admin Master",
  role: "admin",
  password: ADMIN_PASSWORD,
  is_master: true,
};

const COORD_USER = {
  email: "coord.demo@celeste.academy",
  personal_email: "coord.demo.pessoal@gmail.com",
  display_name: "Coordenador Demo",
  role: "coordenador",
  password: DEMO_PASSWORD,
};

const EXERCISES = [
  {
    title: "Demo: Ola Mundo",
    difficulty: "facil",
    xp_reward: 10,
    description:
      "Imprima exatamente `Ola, Mundo!` no console.\n\nUse `Console.WriteLine`.",
    starter_code:
      "using System;\n\nclass Program\n{\n    static void Main()\n    {\n        // escreva aqui\n    }\n}\n",
    tests: [{ stdin: "", expected_stdout: "Ola, Mundo!\n", is_hidden: false }],
  },
  {
    title: "Demo: Soma",
    difficulty: "facil",
    xp_reward: 15,
    description:
      "Leia dois numeros inteiros, um por linha, e imprima a soma.",
    starter_code:
      "using System;\n\nclass Program\n{\n    static void Main()\n    {\n        int a = int.Parse(Console.ReadLine());\n        int b = int.Parse(Console.ReadLine());\n        Console.WriteLine(a + b);\n    }\n}\n",
    tests: [
      { stdin: "3\n5\n", expected_stdout: "8\n", is_hidden: false },
      { stdin: "-5\n5\n", expected_stdout: "0\n", is_hidden: true },
    ],
  },
  {
    title: "Demo: Par ou Impar",
    difficulty: "medio",
    xp_reward: 20,
    language: "csharp",
    description:
      "Leia um numero inteiro e imprima `Par` se ele for par ou `Impar` se ele for impar.",
    starter_code:
      "using System;\n\nclass Program\n{\n    static void Main()\n    {\n        int n = int.Parse(Console.ReadLine());\n        // implemente\n    }\n}\n",
    tests: [
      { stdin: "4\n", expected_stdout: "Par\n", is_hidden: false },
      { stdin: "7\n", expected_stdout: "Impar\n", is_hidden: false },
      { stdin: "0\n", expected_stdout: "Par\n", is_hidden: true },
    ],
  },
  {
    // Exercício em Python — testa a Fase de linguagens dinâmicas.
    title: "Demo: Soma em Python",
    difficulty: "facil",
    xp_reward: 15,
    language: "python",
    description:
      "Leia dois numeros inteiros, um por linha, e imprima a soma.\n\nUse `input()` e `print()`.",
    starter_code: "a = int(input())\nb = int(input())\n# imprima a soma\n",
    tests: [
      { stdin: "3\n5\n", expected_stdout: "8\n", is_hidden: false },
      { stdin: "10\n20\n", expected_stdout: "30\n", is_hidden: true },
    ],
  },
];

// Banco de exercícios CATALOGADOS — de AMBOS os professores, vinculados a UC(s)
// e com a flag "sugerido para prova". Exercita os filtros do catálogo
// (curso/UC/dificuldade/prova/autor) e o fluxo "usar em uma turma". `author`
// "prof" = prof.demo (dono), "prof2" = prof2.demo. `ucs` referencia UCs pelo
// título (mapeado para curricular_units.id no seedCatalogo).
const CATALOGO = [
  {
    author: "prof2",
    title: "Catálogo: FizzBuzz",
    language: "python",
    difficulty: "facil",
    xp_reward: 15,
    exam: false,
    ucs: ["Codificação de Sistemas de Jogos Digitais"],
    description:
      "Leia um inteiro N e imprima de 1 a N, um por linha: `Fizz` para múltiplos de 3, `Buzz` para múltiplos de 5, `FizzBuzz` para múltiplos de ambos, senão o próprio número.",
    starter_code: "n = int(input())\n# imprima de 1 a n aplicando as regras\n",
    tests: [
      { stdin: "5\n", expected_stdout: "1\n2\nFizz\n4\nBuzz\n", is_hidden: false },
      { stdin: "3\n", expected_stdout: "1\n2\nFizz\n", is_hidden: true },
    ],
  },
  {
    author: "prof2",
    title: "Catálogo: Fatorial",
    language: "csharp",
    difficulty: "dificil",
    xp_reward: 30,
    exam: true,
    ucs: ["Codificação de Sistemas de Jogos Digitais"],
    description: "Leia um inteiro N (0 ≤ N ≤ 12) e imprima N! (fatorial de N).",
    starter_code:
      "using System;\n\nclass Program\n{\n    static void Main()\n    {\n        int n = int.Parse(Console.ReadLine());\n        // calcule e imprima n!\n    }\n}\n",
    tests: [
      { stdin: "5\n", expected_stdout: "120\n", is_hidden: false },
      { stdin: "0\n", expected_stdout: "1\n", is_hidden: true },
    ],
  },
  {
    author: "prof2",
    title: "Catálogo: Contar vogais",
    language: "python",
    difficulty: "medio",
    xp_reward: 20,
    exam: true,
    ucs: ["Codificação de Sistemas de Jogos Digitais"],
    description:
      "Leia uma linha de texto e imprima a quantidade de vogais (a, e, i, o, u — maiúsculas ou minúsculas).",
    starter_code: "s = input()\n# conte as vogais e imprima o total\n",
    tests: [
      { stdin: "Programacao\n", expected_stdout: "5\n", is_hidden: false },
      { stdin: "AEIOU\n", expected_stdout: "5\n", is_hidden: true },
    ],
  },
  {
    author: "prof",
    title: "Catálogo: Inverter string",
    language: "csharp",
    difficulty: "facil",
    xp_reward: 10,
    exam: false,
    ucs: ["Codificação de Sistemas de Jogos Digitais"],
    description: "Leia uma linha e imprima o texto invertido (de trás para frente).",
    starter_code:
      "using System;\n\nclass Program\n{\n    static void Main()\n    {\n        string s = Console.ReadLine();\n        // imprima s invertida\n    }\n}\n",
    tests: [
      { stdin: "abc\n", expected_stdout: "cba\n", is_hidden: false },
      { stdin: "Celeste\n", expected_stdout: "etseleC\n", is_hidden: true },
    ],
  },
  {
    author: "prof2",
    title: "Catálogo: Encontrar o bug (soma de N números)",
    language: "csharp",
    difficulty: "medio",
    xp_reward: 20,
    exam: true,
    ucs: ["Testes de Jogos Digitais"],
    description:
      "O código inicial tenta ler N e depois N números, somando-os — mas tem um bug no laço (estoura o índice). Corrija para que ele leia exatamente N números e imprima a soma.",
    starter_code:
      "using System;\n\nclass Program\n{\n    static void Main()\n    {\n        int n = int.Parse(Console.ReadLine());\n        int soma = 0;\n        for (int i = 0; i <= n; i++) // bug: <= lê um número a mais\n        {\n            soma += int.Parse(Console.ReadLine());\n        }\n        Console.WriteLine(soma);\n    }\n}\n",
    tests: [
      { stdin: "3\n10\n20\n30\n", expected_stdout: "60\n", is_hidden: false },
      { stdin: "1\n5\n", expected_stdout: "5\n", is_hidden: true },
    ],
  },
  {
    author: "prof",
    title: "Catálogo: Média de notas",
    language: "python",
    difficulty: "facil",
    xp_reward: 15,
    exam: false,
    ucs: ["Codificação de Sistemas de Jogos Digitais", "Testes de Jogos Digitais"],
    description:
      "Leia 3 notas (uma por linha) e imprima a média aritmética com 1 casa decimal.",
    starter_code: "a = float(input())\nb = float(input())\nc = float(input())\n# imprima a média com 1 casa decimal\n",
    tests: [
      { stdin: "6\n7\n8\n", expected_stdout: "7.0\n", is_hidden: false },
      { stdin: "10\n10\n10\n", expected_stdout: "10.0\n", is_hidden: true },
    ],
  },
];

// Curso técnico real (apenas a FORMAÇÃO TÉCNICA do PPC de Jogos Digitais —
// ignorando a formação geral básica do ensino médio). Cargas e UCs baseadas no
// itinerário do Técnico em Desenvolvimento de Sistemas / Jogos Digitais SENAI.
const COURSE = {
  name: "Técnico em Jogos Digitais (parte técnica)",
  eixo: "Informação e Comunicação",
  carga_horaria_total: 1200,
  modules: [
    {
      name: "Módulo Introdutório (técnico)",
      units: [
        {
          title: "Fundamentos de Jogos Digitais",
          carga_horaria_h: 36,
          objetivo_geral:
            "Compreender a indústria de jogos, seus gêneros, plataformas, papéis profissionais e o pipeline de produção.",
          capabilities: [
            { code: "H117", description: "Identificar gêneros, plataformas e modelos de negócio de jogos digitais.", kind: "tecnica" },
            { code: "H118", description: "Reconhecer os papéis de uma equipe de produção de jogos.", kind: "tecnica" },
            { description: "Trabalhar em equipe respeitando prazos e combinados.", kind: "socioemocional" },
          ],
          knowledge: [
            { text: "História e mercado dos jogos digitais", children: ["Gêneros", "Plataformas", "Modelos de monetização"] },
            { text: "Pipeline de produção", children: ["Pré-produção", "Produção", "Pós-produção"] },
            { text: "Papéis profissionais", children: ["Game designer", "Programador", "Artista", "Produtor"] },
          ],
          bibliography: [
            { reference: "SCHELL, Jesse. A Arte de Game Design. Elsevier, 2011.", tipo: "basica" },
            { reference: "ROGERS, Scott. Level Up! Um Guia para o Design de Grandes Jogos. Blucher, 2013.", tipo: "complementar" },
          ],
        },
      ],
    },
    {
      name: "Específico I",
      units: [
        {
          title: "Planejamento de Elementos Multimídia",
          carga_horaria_h: 40,
          objetivo_geral:
            "Planejar os elementos visuais, sonoros e narrativos de um jogo a partir do conceito e do game design document.",
          capabilities: [
            { code: "H201", description: "Elaborar o conceito e o GDD de um jogo.", kind: "tecnica" },
            { code: "H202", description: "Planejar arte, áudio e narrativa conforme o público-alvo.", kind: "tecnica" },
          ],
          knowledge: [
            { text: "Game Design Document (GDD)", children: ["Conceito", "Mecânicas", "Público-alvo"] },
            { text: "Direção de arte", children: ["Estilo visual", "Paleta", "Referências"] },
            { text: "Áudio e narrativa", children: ["Trilha", "Efeitos", "Roteiro"] },
          ],
          bibliography: [
            { reference: "NOVAK, Jeannie. Desenvolvimento de Games. Cengage, 2010.", tipo: "basica" },
          ],
        },
        {
          title: "Produção de Elementos Multimídia",
          carga_horaria_h: 200,
          objetivo_geral:
            "Produzir sprites, cenários, interfaces, áudio e animações 2D/3D para integração no jogo.",
          capabilities: [
            { code: "H210", description: "Produzir assets 2D (sprites, tilesets, UI).", kind: "tecnica" },
            { code: "H211", description: "Produzir e editar áudio e animações para jogos.", kind: "tecnica" },
          ],
          knowledge: [
            { text: "Arte 2D", children: ["Sprites", "Tilesets", "UI/HUD"] },
            { text: "Animação", children: ["Frame a frame", "Esqueletal"] },
            { text: "Áudio", children: ["Edição", "Mixagem", "Formatos"] },
          ],
          bibliography: [
            { reference: "Documentação oficial do motor de jogo adotado.", tipo: "basica" },
          ],
        },
      ],
    },
    {
      name: "Específico II",
      units: [
        {
          title: "Codificação de Sistemas de Jogos Digitais",
          carga_horaria_h: 180,
          objetivo_geral:
            "Implementar mecânicas, sistemas e lógica de jogo usando linguagem de programação e motor de jogo.",
          capabilities: [
            { code: "H301", description: "Implementar mecânicas de jogo em C# no motor de jogo.", kind: "tecnica" },
            { code: "H302", description: "Estruturar código orientado a objetos e componentes.", kind: "tecnica" },
            { code: "H303", description: "Integrar arte, áudio e física no projeto.", kind: "tecnica" },
          ],
          knowledge: [
            { text: "Lógica e linguagem de programação", children: ["Variáveis e tipos", "Estruturas de controle", "Funções"] },
            { text: "Orientação a objetos", children: ["Classes", "Herança", "Componentes"] },
            { text: "Motor de jogo", children: ["Cena e GameObjects", "Física", "Input", "Áudio"] },
          ],
          bibliography: [
            { reference: "NYSTROM, Robert. Game Programming Patterns. 2014.", tipo: "basica" },
            { reference: "Documentação oficial do C# (Microsoft Learn).", tipo: "complementar" },
          ],
        },
        {
          title: "Testes de Jogos Digitais",
          carga_horaria_h: 60,
          objetivo_geral:
            "Planejar e executar testes de funcionalidade, jogabilidade e desempenho, registrando e priorizando defeitos.",
          capabilities: [
            { code: "H401", description: "Elaborar e executar casos de teste.", kind: "tecnica" },
            { code: "H402", description: "Registrar e priorizar bugs em ferramenta de rastreamento.", kind: "tecnica" },
          ],
          knowledge: [
            { text: "Tipos de teste", children: ["Funcional", "Jogabilidade", "Desempenho"] },
            { text: "Gestão de defeitos", children: ["Registro", "Severidade", "Prioridade"] },
          ],
          bibliography: [
            { reference: "SCHULTZ, Charles P. Game Testing All in One. 2016.", tipo: "basica" },
          ],
        },
        {
          title: "Manutenção de Jogos Digitais",
          carga_horaria_h: 30,
          objetivo_geral:
            "Realizar manutenção corretiva e evolutiva, publicar atualizações e acompanhar métricas pós-lançamento.",
          capabilities: [
            { code: "H501", description: "Aplicar correções e melhorias após o lançamento.", kind: "tecnica" },
            { code: "H502", description: "Publicar atualizações e analisar métricas de uso.", kind: "tecnica" },
          ],
          knowledge: [
            { text: "Manutenção de software", children: ["Corretiva", "Evolutiva"] },
            { text: "Publicação e métricas", children: ["Lojas/plataformas", "Telemetria"] },
          ],
          bibliography: [
            { reference: "Material institucional do SENAI sobre manutenção de software.", tipo: "basica" },
          ],
        },
      ],
    },
  ],
};

function loadEnv() {
  const raw = readFileSync(ENV_PATH, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    process.env[key] = value;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name} em .env.local`);
  return value;
}

async function listAllUsers(supabase) {
  const users = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
    page += 1;
  }
  return users;
}

async function findUserByEmail(supabase, email) {
  const users = await listAllUsers(supabase);
  return users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
}

async function ensureUser(supabase, user) {
  // Metadata no formato do modelo de identidades atual: dois emails e contas de
  // demo JÁ liberadas (sem forçar primeiro acesso), para testar direto.
  const metadata = {
    display_name: user.display_name,
    role: user.role,
    institutional_email: user.email,
    personal_email: user.personal_email ?? null,
    must_change_password: false,
    profile_completed: true,
  };
  const password = user.password ?? DEMO_PASSWORD;
  const existing = await findUserByEmail(supabase, user.email);

  if (!existing) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    await upsertProfile(supabase, data.user.id, user);
    return data.user.id;
  }

  const { error } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    user_metadata: metadata,
  });
  if (error) throw error;

  await upsertProfile(supabase, existing.id, user);
  return existing.id;
}

async function upsertProfile(supabase, id, user) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id,
      role: user.role,
      display_name: user.display_name,
      institutional_email: user.email,
      personal_email: user.personal_email ?? null,
      must_change_password: false,
      profile_completed: true,
      disabled_at: null,
      is_master: user.is_master ?? false,
      xp: 0,
      level: 1,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

async function resetDemoData(supabase) {
  const { data: demoClasses, error: classesError } = await supabase
    .from("classes")
    .select("id")
    .eq("invite_code", INVITE_CODE);
  if (classesError) throw classesError;

  const classIds = (demoClasses ?? []).map((item) => item.id);
  if (classIds.length > 0) {
    const { data: assignments, error: assignmentsError } = await supabase
      .from("assignments")
      .select("id")
      .in("class_id", classIds);
    if (assignmentsError) throw assignmentsError;

    const assignmentIds = (assignments ?? []).map((item) => item.id);
    if (assignmentIds.length > 0) {
      await must(supabase.from("assignment_exercises").delete().in("assignment_id", assignmentIds));
      await must(supabase.from("submissions").delete().in("assignment_id", assignmentIds));
      await must(supabase.from("assignments").delete().in("id", assignmentIds));
    }

    await must(supabase.from("class_members").delete().in("class_id", classIds));
    await must(supabase.from("classes").delete().in("id", classIds));
  }

  // Banco de questões SAEP do professor demo (não cascateia por turma; é por
  // autor). quiz_simulados/quiz_attempts e sap_assessments já caíram via cascade
  // dos assignments removidos acima.
  const demoTeacher = await findUserByEmail(supabase, USERS[0].email);
  if (demoTeacher) {
    await must(supabase.from("quiz_questions").delete().eq("author_id", demoTeacher.id));
  }

  // Curso demo (cascateia módulos/UCs/planos/blocos + matriz de competências;
  // class_units/attendance já foram removidos junto com a turma acima).
  await must(supabase.from("courses").delete().eq("name", COURSE.name));

  // Exercícios de trabalho (não-código) criados por seedTrabalhos.
  await must(
    supabase
      .from("exercises")
      .delete()
      .in("title", [
        "Apresentação: Conceito do Jogo (GDD)",
        "Ficha técnica do personagem",
      ]),
  );

  // Exercícios do catálogo (seedCatalogo). exercise_units/testes/vínculos caem
  // por cascade ao apagar o exercício. Prefixo "Catálogo:" identifica todos.
  await must(supabase.from("exercises").delete().like("title", "Catálogo:%"));

  const titles = EXERCISES.map((exercise) => exercise.title);
  const { data: demoExercises, error: exercisesError } = await supabase
    .from("exercises")
    .select("id")
    .in("title", titles);
  if (exercisesError) throw exercisesError;

  const exerciseIds = (demoExercises ?? []).map((item) => item.id);
  if (exerciseIds.length > 0) {
    await must(supabase.from("assignment_exercises").delete().in("exercise_id", exerciseIds));
    await must(supabase.from("submissions").delete().in("exercise_id", exerciseIds));
    await must(supabase.from("exercise_tests").delete().in("exercise_id", exerciseIds));
    await must(supabase.from("exercises").delete().in("id", exerciseIds));
  }
}

async function resetDemoUsers(supabase) {
  for (const user of USERS) {
    const existing = await findUserByEmail(supabase, user.email);
    if (existing) {
      const { error } = await supabase.auth.admin.deleteUser(existing.id);
      if (error) throw error;
    }
  }
}

async function must(query) {
  const { error } = await query;
  if (error) throw error;
}

async function seedDemo(supabase) {
  // Admin demo (para o painel administrativo e os relatórios).
  await ensureUser(supabase, ADMIN_USER);

  // Coordenador demo (supervisiona qualquer turma; painel /coordenador).
  await ensureUser(supabase, COORD_USER);

  // Referencia por email (robusto a mudanças de ordem em USERS).
  const byEmail = (e) => USERS.find((u) => u.email === e);
  const teacherId = await ensureUser(supabase, byEmail("prof.demo@codequest.dev"));
  const teacher2Id = await ensureUser(supabase, byEmail("prof2.demo@codequest.dev"));
  const studentIds = [
    await ensureUser(supabase, byEmail("aluno1.demo@codequest.dev")),
    await ensureUser(supabase, byEmail("aluno2.demo@codequest.dev")),
  ];

  const { data: classroom, error: classError } = await supabase
    .from("classes")
    .insert({
      owner_id: teacherId,
      name: "Turma Demo",
      description: "Turma basica para testar aluno, professor, lista e ranking.",
      invite_code: INVITE_CODE,
    })
    .select("id")
    .single();
  if (classError) throw classError;

  await must(
    supabase.from("class_members").insert(
      studentIds.map((studentId) => ({
        class_id: classroom.id,
        student_id: studentId,
      })),
    ),
  );

  const exerciseIds = [];
  for (const [exerciseIndex, exercise] of EXERCISES.entries()) {
    const { data: insertedExercise, error: exerciseError } = await supabase
      .from("exercises")
      .insert({
        author_id: teacherId,
        title: exercise.title,
        description: exercise.description,
        starter_code: exercise.starter_code,
        language: exercise.language === "python" ? "python" : "csharp",
        language_id: exercise.language ?? "csharp",
        difficulty: exercise.difficulty,
        xp_reward: exercise.xp_reward,
        is_public: true,
      })
      .select("id")
      .single();
    if (exerciseError) throw exerciseError;

    exerciseIds.push(insertedExercise.id);

    await must(
      supabase.from("exercise_tests").insert(
        exercise.tests.map((test, testIndex) => ({
          exercise_id: insertedExercise.id,
          ord: testIndex + 1,
          stdin: test.stdin,
          expected_stdout: test.expected_stdout,
          is_hidden: test.is_hidden,
          weight: 1,
        })),
      ),
    );

    console.log(`Exercicio ${exerciseIndex + 1}: ${exercise.title}`);
  }

  // Prazo daqui a 5 dias → aparece no widget "Próximas entregas".
  const dueAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .insert({
      class_id: classroom.id,
      title: "Lista Demo",
      kind: "lista",
      due_at: dueAt,
    })
    .select("id")
    .single();
  if (assignmentError) throw assignmentError;

  await must(
    supabase.from("assignment_exercises").insert(
      exerciseIds.map((exerciseId, index) => ({
        assignment_id: assignment.id,
        exercise_id: exerciseId,
        ord: index + 1,
      })),
    ),
  );

  // Submissão de exemplo do Aluno 1 no 1º exercício, JÁ APROVADA e CORRIGIDA
  // pelo professor — para testar a tela de correção e o feedback do aluno.
  const { error: subError } = await supabase.from("submissions").insert({
    exercise_id: exerciseIds[0],
    student_id: studentIds[0],
    assignment_id: assignment.id,
    code:
      'using System;\n\nclass Program\n{\n    static void Main()\n    {\n        Console.WriteLine("Ola, Mundo!");\n    }\n}\n',
    status: "aprovado",
    passed_count: 1,
    total_count: 1,
    keystroke_count: 42,
    paste_event_count: 0,
    time_to_solve_ms: 120000,
    manual_grade: 10,
    manual_feedback:
      "Excelente! Saída exata e código limpo. Para o próximo, tente comentar o que cada linha faz.",
    graded_by: teacherId,
    graded_at: new Date().toISOString(),
  });
  if (subError) throw subError;

  // ---- Camada curricular: curso + matriz + plano de ensino demo + frequência ----
  const { classUnitId, matrix, classUnits, ucs } = await seedCurriculo(supabase, {
    teacherId,
    classId: classroom.id,
    studentIds,
  });

  // ---- Catálogo compartilhado: exercícios dos 2 professores, vinculados a UCs,
  //      alguns marcados como prova (precisa da migration 0054 aplicada) ----
  await seedCatalogo(supabase, { teacherId, teacher2Id, ucs });

  // ---- Trabalhos não-código: apresentação + modelo de resposta + grupo ----
  const { groupId } = await seedTrabalhos(supabase, {
    teacherId,
    classId: classroom.id,
    studentIds,
  });

  // ---- SAEP (simulado teórico) + SAP (prático) na UC ----
  await seedSaepSap(supabase, {
    teacherId,
    classId: classroom.id,
    classUnitId,
    studentIds,
    matrix,
  });

  // ---- Projeto Integrador (board com tarefas) na UC ----
  await seedProjetoIntegrador(supabase, {
    classId: classroom.id,
    classUnitId,
    groupId,
    teacherId,
    studentIds,
  });

  // ---- Exercícios criativos (pixel / vetor / arte / blocos) ----
  await seedExerciciosCriativos(supabase, { teacherId, classId: classroom.id });

  // ---- Feriados + calendário do curso (pré-montado) ----
  await seedCalendario(supabase, { teacherId, classId: classroom.id, classUnits });

  // ---- Co-docência (2º professor + responsável por UC) + feedback anônimo ----
  await seedCoDocencia(supabase, {
    classId: classroom.id,
    teacherId,
    teacher2Id,
    classUnitId,
    studentIds,
  });
}

// Adiciona o 2º professor como co-docente, define-o responsável pela UC, e cria
// alguns feedbacks anônimos de exemplo (hash com FEEDBACK_SECRET, sem autor).
async function seedCoDocencia(supabase, { classId, teacherId, teacher2Id, classUnitId, studentIds }) {
  await must(
    supabase
      .from("class_teachers")
      .upsert({ class_id: classId, teacher_id: teacher2Id, added_by: teacherId }, { onConflict: "class_id,teacher_id" }),
  );

  // 2º professor vira responsável pela UC de codificação (substituição/divisão).
  if (classUnitId) {
    await must(supabase.from("class_units").update({ teacher_id: teacher2Id }).eq("id", classUnitId));
  }

  // Feedbacks anônimos de exemplo. O dedupe_hash usa o MESMO segredo da app.
  const secret = process.env.FEEDBACK_SECRET;
  if (!secret) {
    console.log("Feedback demo pulado (FEEDBACK_SECRET ausente no .env.local).");
    return;
  }
  const { createHmac } = await import("node:crypto");
  const hash = (studentId, target, alvo) =>
    createHmac("sha256", secret).update(`${studentId}:${target}:${alvo}`).digest("hex");

  // Limpa feedbacks demo anteriores deste professor (idempotência).
  await supabase.from("teacher_feedback").delete().eq("teacher_id", teacher2Id);

  const rows = [
    { student: studentIds[0], rating: 5, comment: "Aulas muito claras e dinâmicas!", alvo: "geral", cu: null },
    { student: studentIds[1], rating: 4, comment: "Bom ritmo, queria mais exercícios práticos.", alvo: "geral", cu: null },
    { student: studentIds[0], rating: 5, comment: "Adorei a aula de hoje.", alvo: classUnitId ?? "geral", cu: classUnitId },
  ].filter((r) => r.student);

  for (const r of rows) {
    await supabase.from("teacher_feedback").insert({
      class_id: classId,
      teacher_id: teacher2Id,
      class_unit_id: r.cu,
      session_id: null,
      rating: r.rating,
      comment: r.comment,
      dedupe_hash: hash(r.student, teacher2Id, r.alvo),
    });
  }

  console.log("Co-docência demo: 2º professor + responsável por UC + 3 feedbacks anônimos.");
}

// Cria 4 exercícios criativos e uma lista que os reúne, para testar cada editor.
async function seedExerciciosCriativos(supabase, { teacherId, classId }) {
  const criativos = [
    {
      title: "Pixel Art — Sprite da Celeste (Demo)",
      description: "Desenhe um sprite 32×32 da Celeste usando lápis, balde e camadas.",
      exercise_type: "pixel_art",
      canvas_config: { width: 32, height: 32 },
    },
    {
      title: "Vetor — Logo do seu jogo (Demo)",
      description: "Crie um logo simples com formas vetoriais (retângulo, elipse, linha).",
      exercise_type: "vetor",
      canvas_config: { width: 640, height: 480 },
    },
    {
      title: "Arte Digital — Cenário (Demo)",
      description: "Pinte um cenário com pincel, camadas e opacidade.",
      exercise_type: "arte_digital",
      canvas_config: { width: 800, height: 600 },
    },
    {
      title: "Blocos — Faça a Celeste contar até 10 (Demo)",
      description:
        "Monte um programa com blocos: crie uma variável, use 'repita' e 'falar/imprimir' para contar de 1 a 10.",
      exercise_type: "blocos",
      canvas_config: { width: 480, height: 360 },
    },
  ];

  const ids = [];
  for (const ex of criativos) {
    const { data } = await supabase
      .from("exercises")
      .insert({
        author_id: teacherId,
        title: ex.title,
        description: ex.description,
        starter_code: "",
        language: "csharp",
        language_id: null,
        difficulty: "facil",
        xp_reward: 0,
        is_public: true,
        exercise_type: ex.exercise_type,
        is_group: false,
        canvas_config: ex.canvas_config,
      })
      .select("id")
      .single()
      .throwOnError();
    ids.push(data.id);
  }

  const { data: lista } = await supabase
    .from("assignments")
    .insert({ class_id: classId, title: "Atividades Criativas (Demo)", kind: "lista" })
    .select("id")
    .single()
    .throwOnError();

  await must(
    supabase.from("assignment_exercises").insert(
      ids.map((exercise_id, i) => ({ assignment_id: lista.id, exercise_id, ord: i + 1 })),
    ),
  );

  console.log("Exercícios criativos demo (pixel/vetor/arte/blocos) criados.");
}

// Feriados institucionais + calendário do curso pré-montado para a Turma Demo,
// com grade gerada (seg-qua), feriados marcados e algumas UCs já alocadas.
async function seedCalendario(supabase, { classId, classUnits }) {
  // 1. Feriados de 2026 (idempotente: limpa e recria os do demo).
  const FERIADOS = [
    { date: "2026-02-16", name: "Carnaval", kind: "feriado" },
    { date: "2026-02-17", name: "Carnaval", kind: "feriado" },
    { date: "2026-02-18", name: "Carnaval", kind: "feriado" },
    { date: "2026-04-21", name: "Tiradentes", kind: "feriado" },
    { date: "2026-05-01", name: "Dia do Trabalho", kind: "feriado" },
    { date: "2026-06-04", name: "Corpus Christi", kind: "feriado" },
    { date: "2026-07-13", name: "Recesso escolar", kind: "recesso" },
    { date: "2026-07-14", name: "Recesso escolar", kind: "recesso" },
    { date: "2026-07-15", name: "Recesso escolar", kind: "recesso" },
  ];
  for (const f of FERIADOS) {
    await supabase.from("institution_holidays").delete().eq("date", f.date).eq("name", f.name);
  }
  await must(supabase.from("institution_holidays").insert(FERIADOS));

  // 2. Calendário da turma. Janela RELATIVA a hoje para o painel do professor
  //    ("Aulas de hoje") aparecer preenchido independentemente de quando o seed
  //    rodar. Inclui o dia de hoje nos dias letivos.
  const hojeDate = new Date();
  const hojeIso = `${hojeDate.getFullYear()}-${String(hojeDate.getMonth() + 1).padStart(2, "0")}-${String(hojeDate.getDate()).padStart(2, "0")}`;
  const isoWeekdayHoje = hojeDate.getDay() === 0 ? 7 : hojeDate.getDay();
  const addDiasIso = (base, n) => {
    const [y, m, d] = base.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + n);
    return dt.toISOString().slice(0, 10);
  };
  const startsOn = addDiasIso(hojeIso, -30);
  const endsOn = addDiasIso(hojeIso, 120);
  // Dias letivos: seg-qua + garante o dia da semana de hoje (p/ ter aula hoje).
  const weekdays = Array.from(new Set([1, 2, 3, isoWeekdayHoje])).sort((a, b) => a - b);
  const aulasPorDia = 4;
  const { data: cal } = await supabase
    .from("course_calendars")
    .upsert(
      { class_id: classId, starts_on: startsOn, ends_on: endsOn, weekdays, aulas_por_dia: aulasPorDia },
      { onConflict: "class_id" },
    )
    .select("id")
    .single()
    .throwOnError();

  // 3. Metas de CH por UC (todas as UCs vinculadas).
  await supabase.from("calendar_uc_targets").delete().eq("calendar_id", cal.id);
  await must(
    supabase.from("calendar_uc_targets").insert(
      classUnits.map((u, i) => ({
        calendar_id: cal.id,
        class_unit_id: u.classUnitId,
        ch_presencial: u.ch,
        ord: i,
      })),
    ),
  );

  // 4. Gera os dias (seg-qua), marca feriados, e aloca as 2 primeiras UCs em
  //    blocos no início para demonstrar o totalizador andando.
  const feriadoPorData = new Map(FERIADOS.map((f) => [f.date, f]));
  const datas = [];
  {
    let cur = startsOn;
    let guard = 0;
    while (cur <= endsOn && guard < 1200) {
      const [y, m, d] = cur.split("-").map(Number);
      const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      const isoDow = dow === 0 ? 7 : dow;
      if (weekdays.includes(isoDow)) datas.push(cur);
      cur = addDiasIso(cur, 1);
      guard += 1;
    }
  }
  const uc0 = classUnits[0]?.classUnitId ?? null; // Codificação
  const uc1 = classUnits[1]?.classUnitId ?? null;
  let alocadosUc0 = 0;
  // Salas demo (idempotente por nome).
  const SALAS = [
    { name: "Sala 101", capacity: 35, kind: "sala" },
    { name: "Lab 1004", capacity: 25, kind: "laboratorio" },
    { name: "Auditório", capacity: 120, kind: "auditorio" },
  ];
  for (const s of SALAS) await supabase.from("rooms").delete().eq("name", s.name);
  const { data: salasCriadas } = await supabase
    .from("rooms")
    .insert(SALAS)
    .select("id, name")
    .throwOnError();
  const sala101 = salasCriadas.find((s) => s.name === "Sala 101")?.id ?? null;
  const lab1004 = salasCriadas.find((s) => s.name === "Lab 1004")?.id ?? null;

  const rows = datas.map((date) => {
    const fer = feriadoPorData.get(date);
    if (fer) return { calendar_id: cal.id, date, class_unit_id: null, marker: fer.kind, note: fer.name, room_id: null };
    // Aloca as ~10 primeiras aulas úteis à UC0 (Sala 101), as 6 seguintes à UC1 (Lab 1004).
    let cu = null;
    let room = null;
    if (alocadosUc0 < 10 && uc0) {
      cu = uc0;
      room = sala101;
      alocadosUc0++;
    } else if (alocadosUc0 >= 10 && alocadosUc0 < 16 && uc1) {
      cu = uc1;
      room = lab1004;
      alocadosUc0++;
    }
    return { calendar_id: cal.id, date, class_unit_id: cu, marker: null, note: null, room_id: room };
  });

  // Garante uma AULA HOJE alocada (UC0 + Sala 101) para o painel do professor.
  const hojeRow = rows.find((r) => r.date === hojeIso);
  if (hojeRow && uc0) {
    hojeRow.marker = null;
    hojeRow.note = null;
    hojeRow.class_unit_id = uc0;
    hojeRow.room_id = sala101;
  }

  await supabase.from("calendar_days").delete().eq("calendar_id", cal.id);
  for (let i = 0; i < rows.length; i += 500) {
    await must(supabase.from("calendar_days").insert(rows.slice(i, i + 500)));
  }

  console.log(
    `Calendário do curso demo criado (${datas.length} dias, ${FERIADOS.length} feriados, ${classUnits.length} UCs, ${SALAS.length} salas alocadas).`,
  );
}

// Exercícios que NÃO são de código (apresentação por link e modelo de resposta),
// um grupo com os dois alunos e uma entrega de grupo já corrigida — para
// demonstrar tipos de exercício, grupos e o dashboard com notas/entregas.
async function seedTrabalhos(supabase, { teacherId, classId, studentIds }) {
  // 1. Exercício de apresentação (em grupo).
  const { data: apres } = await supabase
    .from("exercises")
    .insert({
      author_id: teacherId,
      title: "Apresentação: Conceito do Jogo (GDD)",
      description:
        "Em grupo, preparem slides com o conceito do jogo (gênero, mecânicas, público) e entreguem o link.",
      starter_code: "",
      language: "csharp",
      language_id: null,
      difficulty: "medio",
      xp_reward: 0,
      is_public: true,
      exercise_type: "apresentacao",
      is_group: true,
    })
    .select("id")
    .single()
    .throwOnError();

  // 2. Exercício de modelo de resposta (individual).
  const { data: modelo } = await supabase
    .from("exercises")
    .insert({
      author_id: teacherId,
      title: "Ficha técnica do personagem",
      description: "Preencha a ficha do personagem principal do seu jogo.",
      starter_code: "",
      language: "csharp",
      language_id: null,
      difficulty: "facil",
      xp_reward: 0,
      is_public: true,
      exercise_type: "modelo_resposta",
      is_group: false,
      response_template:
        "Nome:\nClasse/arquétipo:\nHabilidades:\nHistória de fundo:",
    })
    .select("id")
    .single()
    .throwOnError();

  // 3. Lista "Trabalhos" com os dois exercícios.
  const { data: lista } = await supabase
    .from("assignments")
    .insert({ class_id: classId, title: "Trabalhos", kind: "lista" })
    .select("id")
    .single()
    .throwOnError();

  await must(
    supabase.from("assignment_exercises").insert([
      { assignment_id: lista.id, exercise_id: apres.id, ord: 1 },
      { assignment_id: lista.id, exercise_id: modelo.id, ord: 2 },
    ]),
  );

  // 4. Grupo com os dois alunos.
  const { data: grupo } = await supabase
    .from("class_groups")
    .insert({ class_id: classId, name: "Grupo 1 — Plataforma 2D" })
    .select("id")
    .single()
    .throwOnError();
  await must(
    supabase.from("class_group_members").insert(
      studentIds.map((sid) => ({ group_id: grupo.id, student_id: sid })),
    ),
  );

  // 5. Entrega de grupo (apresentação) já corrigida + entrega individual.
  await must(
    supabase.from("submissions").insert([
      {
        exercise_id: apres.id,
        assignment_id: lista.id,
        student_id: studentIds[0],
        group_id: grupo.id,
        status: "entregue",
        submission_link: "https://docs.google.com/presentation/d/exemplo-gdd",
        manual_grade: 9,
        manual_feedback: "Ótimo conceito! Caprichem na arte na próxima entrega.",
        graded_by: teacherId,
        graded_at: new Date().toISOString(),
      },
      {
        exercise_id: modelo.id,
        assignment_id: lista.id,
        student_id: studentIds[0],
        status: "entregue",
        response_text:
          "Nome: Aria\nClasse/arquétipo: Exploradora\nHabilidades: dash duplo\nHistória de fundo: ...",
      },
    ]),
  );

  console.log("Trabalhos demo (apresentação + modelo + grupo) criados.");
  return { groupId: grupo.id };
}

// Projeto Integrador (TCC): atividade kind=projeto_integrador na UC, com sprint e
// um board de tarefas em status variados (a_fazer/fazendo/concluido) para o grupo
// — alimenta o relatório de Projetos Integradores do admin (% concluído).
async function seedProjetoIntegrador(
  supabase,
  { classId, classUnitId, groupId, teacherId, studentIds },
) {
  if (!classUnitId || !groupId) {
    console.log("Projeto integrador demo pulado (sem class_unit ou grupo).");
    return;
  }

  const { data: assignment } = await supabase
    .from("assignments")
    .insert({
      class_id: classId,
      class_unit_id: classUnitId,
      title: "Projeto Integrador — Jogo Autoral (Demo)",
      kind: "projeto_integrador",
    })
    .select("id")
    .single()
    .throwOnError();

  const { data: project } = await supabase
    .from("projects")
    .insert({
      assignment_id: assignment.id,
      class_unit_id: classUnitId,
      title: "Jogo Autoral — Plataforma 2D",
      description: "Desenvolver um protótipo jogável com 1 fase completa.",
    })
    .select("id")
    .single()
    .throwOnError();

  const { data: sprint } = await supabase
    .from("project_sprints")
    .insert({
      project_id: project.id,
      title: "Sprint 1 — Pré-produção",
      goal: "GDD, arte conceitual e protótipo de movimentação.",
      ord: 0,
    })
    .select("id")
    .single()
    .throwOnError();

  // Tarefas em status variados → progresso ~40% (2 de 5 concluídas).
  const tasks = [
    { title: "Escrever o GDD", status: "concluido" },
    { title: "Arte conceitual do personagem", status: "concluido" },
    { title: "Protótipo de movimentação", status: "fazendo" },
    { title: "Design da fase 1", status: "a_fazer" },
    { title: "Trilha sonora", status: "a_fazer" },
  ];
  await must(
    supabase.from("project_tasks").insert(
      tasks.map((t, i) => ({
        project_id: project.id,
        group_id: groupId,
        sprint_id: sprint.id,
        title: t.title,
        status: t.status,
        assignee_id: studentIds[i % studentIds.length],
        created_by: teacherId,
        ord: i,
      })),
    ),
  );

  console.log("Projeto integrador demo criado (1 sprint, 5 tarefas).");
}

// Banco de exercícios catalogado (feature "catálogo compartilhado"): cria os
// exercícios de CATALOGO — de ambos os professores — com testes, vínculo a UC(s)
// e flag is_exam_suitable. Auto-pula se a migration 0054 (exercise_units /
// is_exam_suitable) ainda não estiver aplicada no banco.
async function seedCatalogo(supabase, { teacherId, teacher2Id, ucs }) {
  // Probe: a migration 0054 está aplicada?
  const probe = await supabase.from("exercise_units").select("exercise_id").limit(1);
  if (probe.error) {
    console.log(
      "Catálogo demo PULADO: aplique a migration 0054 (exercise_units + is_exam_suitable) e rode o seed de novo.",
    );
    return;
  }

  const ucIdByTitle = new Map((ucs ?? []).map((u) => [u.title, u.id]));
  const authorOf = (a) => (a === "prof2" ? teacher2Id : teacherId);

  let count = 0;
  for (const ex of CATALOGO) {
    const { data: row } = await supabase
      .from("exercises")
      .insert({
        author_id: authorOf(ex.author),
        title: ex.title,
        description: ex.description,
        starter_code: ex.starter_code,
        language: ex.language === "python" ? "python" : "csharp",
        language_id: ex.language ?? "csharp",
        difficulty: ex.difficulty,
        xp_reward: ex.xp_reward,
        is_public: true,
        is_exam_suitable: ex.exam ?? false,
      })
      .select("id")
      .single()
      .throwOnError();

    if (ex.tests?.length) {
      await must(
        supabase.from("exercise_tests").insert(
          ex.tests.map((t, i) => ({
            exercise_id: row.id,
            ord: i + 1,
            stdin: t.stdin,
            expected_stdout: t.expected_stdout,
            is_hidden: t.is_hidden ?? false,
            weight: 1,
          })),
        ),
      );
    }

    const links = (ex.ucs ?? [])
      .map((title) => ucIdByTitle.get(title))
      .filter(Boolean)
      .map((uc_id) => ({ exercise_id: row.id, uc_id }));
    if (links.length) await must(supabase.from("exercise_units").insert(links));

    count += 1;
  }

  console.log(
    `Catálogo demo: ${count} exercícios (2 professores, vinculados a UCs, ${CATALOGO.filter((e) => e.exam).length} de prova).`,
  );
}

// Grava o curso técnico, cria um plano de ensino do prof.demo para a UC de
// codificação, vincula essa UC à Turma Demo e lança uma frequência de exemplo.
async function seedCurriculo(supabase, { teacherId, classId, studentIds }) {
  const { data: course, error: courseErr } = await supabase
    .from("courses")
    .insert({
      author_id: teacherId,
      name: COURSE.name,
      eixo: COURSE.eixo,
      carga_horaria_total: COURSE.carga_horaria_total,
      is_public: true,
    })
    .select("id")
    .single();
  if (courseErr) throw courseErr;

  // Matriz de competências do curso (SAEP/SAP): capacidades + objetos de
  // conhecimento, baseados na matriz oficial do Técnico em Jogos Digitais.
  const matrix = await seedMatriz(supabase, course.id);

  let codificacaoUcId = null;
  const todasUcs = []; // {id, title, ch} de todas as UCs do curso (p/ calendário)

  for (const [mi, mod] of COURSE.modules.entries()) {
    const { data: moduleRow } = await supabase
      .from("course_modules")
      .insert({ course_id: course.id, name: mod.name, ord: mi })
      .select("id")
      .single()
      .throwOnError();

    for (const [ui, unit] of mod.units.entries()) {
      const { data: ucRow } = await supabase
        .from("curricular_units")
        .insert({
          module_id: moduleRow.id,
          title: unit.title,
          carga_horaria_h: unit.carga_horaria_h ?? null,
          objetivo_geral: unit.objetivo_geral ?? null,
          ord: ui,
        })
        .select("id")
        .single()
        .throwOnError();

      if (unit.title.startsWith("Codificação")) codificacaoUcId = ucRow.id;
      todasUcs.push({ id: ucRow.id, title: unit.title, ch: unit.carga_horaria_h ?? 0 });

      if (unit.capabilities?.length) {
        await must(
          supabase.from("uc_capabilities").insert(
            unit.capabilities.map((c, i) => ({
              uc_id: ucRow.id,
              code: c.code ?? null,
              description: c.description,
              kind: c.kind ?? "tecnica",
              ord: i,
            })),
          ),
        );
      }

      for (const [ki, k] of (unit.knowledge ?? []).entries()) {
        const { data: parent } = await supabase
          .from("uc_knowledge")
          .insert({ uc_id: ucRow.id, text: k.text, ord: ki })
          .select("id")
          .single()
          .throwOnError();
        if (k.children?.length) {
          await must(
            supabase.from("uc_knowledge").insert(
              k.children.map((text, ci) => ({
                uc_id: ucRow.id,
                parent_id: parent.id,
                text,
                ord: ci,
              })),
            ),
          );
        }
      }

      if (unit.bibliography?.length) {
        await must(
          supabase.from("uc_bibliography").insert(
            unit.bibliography.map((b, i) => ({
              uc_id: ucRow.id,
              reference: b.reference,
              tipo: b.tipo ?? "basica",
              ord: i,
            })),
          ),
        );
      }
    }
  }

  console.log(`Curso: ${COURSE.name}`);

  if (!codificacaoUcId) return;

  // Plano de ensino demo do prof.demo para a UC de Codificação.
  const { data: plan } = await supabase
    .from("teaching_plans")
    .insert({
      uc_id: codificacaoUcId,
      owner_id: teacherId,
      title: "Plano de Ensino — Codificação (3ª série)",
    })
    .select("id")
    .single()
    .throwOnError();

  await must(
    supabase.from("teaching_plan_blocks").insert([
      {
        plan_id: plan.id,
        title: "Bloco 01 — Aulas 01–12: Lógica e C#",
        aula_inicio: 1,
        aula_fim: 12,
        conteudo: "Variáveis, tipos, estruturas de controle e funções em C#.",
        atividade: "Lista de exercícios de lógica (ver Lista Demo).",
        criterios: "Resolver 80% dos exercícios com saída correta.",
        ord: 0,
      },
      {
        plan_id: plan.id,
        title: "Bloco 02 — Aulas 13–24: OO e Componentes",
        aula_inicio: 13,
        aula_fim: 24,
        conteudo: "Classes, herança e arquitetura de componentes no motor de jogo.",
        atividade: "Implementar o controlador do personagem.",
        criterios: "Personagem se move e colide corretamente.",
        ord: 1,
      },
      {
        plan_id: plan.id,
        title: "Bloco 03 — Aulas 25–36: Mecânicas e Integração",
        aula_inicio: 25,
        aula_fim: 36,
        conteudo: "Implementação de mecânicas, integração de arte, áudio e física.",
        atividade: "Protótipo jogável da fase 1.",
        criterios: "Protótipo executa do início ao fim sem erros bloqueantes.",
        ord: 2,
      },
    ]),
  );

  // Vincula a UC à Turma Demo, escolhendo o plano criado.
  const { data: classUnit } = await supabase
    .from("class_units")
    .insert({
      class_id: classId,
      uc_id: codificacaoUcId,
      teaching_plan_id: plan.id,
      serie: "3ª série",
    })
    .select("id")
    .single()
    .throwOnError();

  // Frequência de exemplo: 2 dias com 4 aulas cada (period 1–4), demonstrando
  // presença POR AULA (o aluno pode faltar só a algumas aulas do dia).
  const day = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toISOString().slice(0, 10);
  };
  const dias = [
    { date: day(7), label: "Lógica e tipos", aulas: 4 },
    { date: day(0), label: "Controle de fluxo", aulas: 4 },
  ];
  const sessionRows = [];
  let n = 0;
  for (const dia of dias) {
    for (let p = 1; p <= dia.aulas; p++) {
      n++;
      sessionRows.push({
        class_unit_id: classUnit.id,
        session_number: n,
        period: p,
        date: dia.date,
        label: dia.label,
      });
    }
  }
  const { data: sessions } = await supabase
    .from("attendance_sessions")
    .insert(sessionRows)
    .select("id, session_number, period, date")
    .throwOnError();

  // Aluno 1: presente em tudo. Aluno 2: no dia 1 faltou a 1ª e a 2ª aula;
  // no dia 2 chegou atrasado na 1ª e faltou a última.
  const marks = [];
  for (const s of sessions) {
    marks.push({ session_id: s.id, student_id: studentIds[0], status: "presente" });

    let status2 = "presente";
    if (s.date === dias[0].date && (s.period === 1 || s.period === 2)) {
      status2 = "falta";
    } else if (s.date === dias[1].date && s.period === 1) {
      status2 = "atraso";
    } else if (s.date === dias[1].date && s.period === dias[1].aulas) {
      status2 = "falta";
    }
    marks.push({ session_id: s.id, student_id: studentIds[1], status: status2 });
  }
  await must(supabase.from("attendance_marks").insert(marks));

  console.log("Plano de ensino demo + frequência por aula (2 dias x 4) criados.");

  // Vincula as DEMAIS UCs do curso à Turma Demo, CADA UMA com um plano de ensino
  // simples (2 blocos com conteúdo) + 2 aulas registradas, para a linha do tempo
  // do aluno aparecer cheia e clicável.
  const classUnits = [{ classUnitId: classUnit.id, title: "Codificação de Sistemas de Jogos Digitais", ch: 180 }];
  const diaSeed = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toISOString().slice(0, 10);
  };
  for (const uc of todasUcs) {
    if (uc.id === codificacaoUcId) continue;

    // Plano de ensino da UC com 2 blocos (conteúdo markdown simples).
    const { data: ucPlan } = await supabase
      .from("teaching_plans")
      .insert({ uc_id: uc.id, owner_id: teacherId, title: `Plano de Ensino — ${uc.title}` })
      .select("id")
      .single()
      .throwOnError();
    await must(
      supabase.from("teaching_plan_blocks").insert([
        {
          plan_id: ucPlan.id,
          title: "Bloco 01 — Fundamentos",
          aula_inicio: 1,
          aula_fim: 2,
          conteudo: `Introdução à UC "${uc.title}": conceitos iniciais, objetivos e materiais de apoio. Reveja os exemplos vistos em aula e refaça os exercícios propostos.`,
          ord: 0,
        },
        {
          plan_id: ucPlan.id,
          title: "Bloco 02 — Prática",
          aula_inicio: 3,
          aula_fim: 4,
          conteudo: `Aplicação prática de "${uc.title}": exercícios guiados e atividade avaliativa. Use o material da aula para revisar antes de entregar.`,
          ord: 1,
        },
      ]),
    );

    const { data: cu } = await supabase
      .from("class_units")
      .insert({ class_id: classId, uc_id: uc.id, teaching_plan_id: ucPlan.id, serie: "3ª série" })
      .select("id")
      .single()
      .throwOnError();

    // 2 aulas registradas (datas recentes) para a linha do tempo do aluno.
    await must(
      supabase.from("attendance_sessions").insert([
        { class_unit_id: cu.id, session_number: 1, period: 1, date: diaSeed(14), label: "Fundamentos" },
        { class_unit_id: cu.id, session_number: 3, period: 1, date: diaSeed(7), label: "Prática" },
      ]),
    );

    classUnits.push({ classUnitId: cu.id, title: uc.title, ch: uc.ch });
  }
  console.log(`UCs vinculadas à Turma Demo: ${classUnits.length} (com plano + aulas).`);

  return { classUnitId: classUnit.id, matrix, classUnits, ucs: todasUcs };
}

// Cria a matriz de competências do curso e devolve os ids por código, para que
// as questões (SAEP) e os itens da rubrica (SAP) possam mapear às competências.
async function seedMatriz(supabase, courseId) {
  const COMPETENCIES = [
    { code: "C3", description: "Aplicar lógica de programação na resolução de problemas inerentes a jogos digitais." },
    { code: "C4", description: "Diferenciar metodologias de desenvolvimento de projetos." },
    { code: "C6", description: "Desenvolver jogos digitais por meio de linguagem de programação." },
    { code: "C7", description: "Selecionar procedimentos de teste que assegurem a aderência aos requisitos." },
  ];
  const OBJECTS = [
    { code: "F", name: "Algoritmos e lógica computacional" },
    { code: "G", name: "Elementos e técnicas de programação" },
    { code: "I", name: "Metodologias de desenvolvimento tradicionais e ágeis" },
    { code: "S", name: "Tipos, níveis e técnicas de teste" },
    { code: "E", name: "Princípios de UI e UX" },
  ];

  const { data: matrixRow } = await supabase
    .from("competency_matrices")
    .insert({ course_id: courseId, version: "1 — Itinerário 2021 (demo)" })
    .select("id")
    .single()
    .throwOnError();

  const { data: comps } = await supabase
    .from("competencies")
    .insert(COMPETENCIES.map((c, i) => ({ matrix_id: matrixRow.id, code: c.code, description: c.description, ord: i })))
    .select("id, code")
    .throwOnError();
  const { data: objs } = await supabase
    .from("knowledge_objects")
    .insert(OBJECTS.map((o, i) => ({ matrix_id: matrixRow.id, code: o.code, name: o.name, ord: i })))
    .select("id, code")
    .throwOnError();

  const comp = Object.fromEntries((comps ?? []).map((c) => [c.code, c.id]));
  const obj = Object.fromEntries((objs ?? []).map((o) => [o.code, o.id]));
  console.log("Matriz de competências (demo) criada.");
  return { id: matrixRow.id, comp, obj };
}

// SAEP teórico (banco + simulado com 1 tentativa enviada) e SAP prático (rubrica
// + 1 entrega + 1 avaliação preenchida) na UC de Codificação da Turma Demo.
// Questões e itens são reais (extraídos dos PDFs do SENAI) e mapeiam à matriz,
// para o dashboard por competência já ter dados.
async function seedSaepSap(supabase, { teacherId, classId, classUnitId, studentIds, matrix }) {
  if (!classUnitId) {
    console.log("SAEP/SAP demo pulado (sem class_unit).");
    return;
  }
  const { comp, obj } = matrix;

  // -------- 1. Banco de questões (formato Contexto/Comando/A-E) --------
  const QUESTIONS = [
    {
      contexto:
        "Uma empresa de desenvolvimento de software está implementando uma série de testes para garantir a qualidade de seu produto. O objetivo é verificar o comportamento do sistema sem conhecer sua estrutura interna.",
      comando: "Qual tipo de teste é indicado para verificar o comportamento sem acessar o código-fonte?",
      difficulty: "medio",
      competency_id: comp.C7,
      knowledge_object_id: obj.S,
      resolucao:
        "Teste de caixa-preta avalia entradas e saídas sem acesso ao código. Caixa-branca seria o oposto.",
      options: [
        { label: "A", text: "Teste de unidade", is_correct: false, justification: "Foca em módulos isolados, geralmente com acesso ao código." },
        { label: "B", text: "Teste de integração", is_correct: false, justification: "Verifica a interação entre módulos." },
        { label: "C", text: "Teste de aceitação", is_correct: false, justification: "Valida requisitos com o cliente, não a ausência de acesso ao código." },
        { label: "D", text: "Teste de caixa branca", is_correct: false, justification: "Exige conhecer a estrutura interna do código." },
        { label: "E", text: "Teste de caixa preta", is_correct: true, justification: "Avalia o comportamento por entradas/saídas, sem acessar o código-fonte." },
      ],
    },
    {
      contexto:
        "Durante o desenvolvimento de uma aplicação, um desenvolvedor precisa organizar melhor seu código usando herança para aproveitar métodos e propriedades de uma classe base em outras classes derivadas.",
      comando: "Qual conceito da Programação Orientada a Objetos descreve essa técnica de reutilização?",
      difficulty: "facil",
      competency_id: comp.C6,
      knowledge_object_id: obj.G,
      resolucao: "Herança permite que classes derivadas reaproveitem membros de uma classe base.",
      options: [
        { label: "A", text: "Encapsulamento", is_correct: false, justification: "Refere-se a ocultar detalhes internos, não à reutilização por hierarquia." },
        { label: "B", text: "Herança", is_correct: true, justification: "É exatamente a reutilização de membros de uma classe base por classes derivadas." },
        { label: "C", text: "Polimorfismo", is_correct: false, justification: "Permite tratar objetos de forma uniforme, não a reutilização em si." },
        { label: "D", text: "Interface", is_correct: false, justification: "Define um contrato, não a herança de implementação." },
        { label: "E", text: "Abstração", is_correct: false, justification: "Foca em expor só o essencial." },
      ],
    },
    {
      contexto:
        "Uma equipe de desenvolvimento utiliza uma metodologia ágil e realiza reuniões diárias de 15 minutos para sincronizar o trabalho.",
      comando: "Como é chamada essa reunião diária e qual metodologia a utiliza?",
      difficulty: "facil",
      competency_id: comp.C4,
      knowledge_object_id: obj.I,
      resolucao: "A Daily Scrum é a reunião diária do Scrum, com timebox de 15 minutos.",
      options: [
        { label: "A", text: "Retrospectiva", is_correct: false, justification: "Ocorre ao fim da sprint, não diariamente." },
        { label: "B", text: "Planejamento de Sprint", is_correct: false, justification: "Planeja a sprint, não é a reunião diária." },
        { label: "C", text: "Daily Scrum", is_correct: true, justification: "É a reunião diária de 15 minutos do Scrum." },
        { label: "D", text: "15 minutos de Cascata", is_correct: false, justification: "Cascata não é ágil nem tem reunião diária." },
        { label: "E", text: "Kanban", is_correct: false, justification: "É um método de fluxo, não a reunião descrita." },
      ],
    },
    {
      contexto:
        "Uma aplicação de catálogo de filmes permite buscar um filme pelo nome percorrendo uma lista até encontrar o título.",
      comando: "Qual algoritmo de busca é mais apropriado para encontrar um nome específico em uma lista não ordenada?",
      difficulty: "medio",
      competency_id: comp.C3,
      knowledge_object_id: obj.F,
      resolucao: "Em lista não ordenada, a busca linear percorre elemento a elemento. Binária exige ordenação.",
      options: [
        { label: "A", text: "Ordenação por inserção", is_correct: false, justification: "É um algoritmo de ordenação, não de busca." },
        { label: "B", text: "Busca binária", is_correct: false, justification: "Requer a lista ordenada." },
        { label: "C", text: "Busca linear", is_correct: true, justification: "Percorre a lista item a item; serve para listas não ordenadas." },
        { label: "D", text: "Ordenação rápida", is_correct: false, justification: "É ordenação (quicksort), não busca." },
        { label: "E", text: "Busca por profundidade", is_correct: false, justification: "Aplica-se a grafos/árvores, não a uma lista simples." },
      ],
    },
    {
      contexto:
        "Um designer de interface quer adicionar um efeito sonoro quando o usuário clica em um botão, para melhorar a experiência.",
      comando: "Qual princípio de UX é aplicado ao incluir um som quando um botão é pressionado?",
      difficulty: "facil",
      competency_id: comp.C3,
      knowledge_object_id: obj.E,
      resolucao: "Dar retorno imediato a uma ação do usuário é o princípio de Feedback.",
      options: [
        { label: "A", text: "Visibilidade do sistema", is_correct: false, justification: "Refere-se a manter o usuário informado do estado, de forma mais ampla." },
        { label: "B", text: "Prevenção de erros", is_correct: false, justification: "Trata de evitar que erros ocorram." },
        { label: "C", text: "Feedback", is_correct: true, justification: "É o retorno imediato (sonoro) a uma ação do usuário." },
        { label: "D", text: "Consistência e padrões", is_correct: false, justification: "Trata de manter padrões na interface." },
        { label: "E", text: "Reconhecimento em vez de memorização", is_correct: false, justification: "Trata de reduzir a carga de memória do usuário." },
      ],
    },
  ];

  const questionIds = [];
  for (const q of QUESTIONS) {
    const { data: qRow } = await supabase
      .from("quiz_questions")
      .insert({
        author_id: teacherId,
        course_id: null,
        competency_id: q.competency_id ?? null,
        knowledge_object_id: q.knowledge_object_id ?? null,
        contexto: q.contexto,
        comando: q.comando,
        resolucao: q.resolucao,
        difficulty: q.difficulty,
        is_public: true,
      })
      .select("id")
      .single()
      .throwOnError();
    await must(
      supabase.from("quiz_options").insert(
        q.options.map((o, i) => ({
          question_id: qRow.id,
          label: o.label,
          text: o.text,
          is_correct: o.is_correct,
          justification: o.justification,
          ord: i,
        })),
      ),
    );
    questionIds.push(qRow.id);
  }
  console.log(`Banco de questões SAEP (demo): ${questionIds.length} questões.`);

  // -------- 2. Simulado (atividade + quiz_simulados + questões) --------
  const { data: simAssign } = await supabase
    .from("assignments")
    .insert({ class_id: classId, class_unit_id: classUnitId, title: "Simulado SAEP — Demo", kind: "saep_simulado" })
    .select("id")
    .single()
    .throwOnError();
  const { data: simulado } = await supabase
    .from("quiz_simulados")
    .insert({
      assignment_id: simAssign.id,
      class_unit_id: classUnitId,
      title: "Simulado SAEP — Demo",
      description: "Simulado teórico de demonstração (5 questões, formato SAEP).",
      time_limit_min: 30,
      show_feedback: true,
    })
    .select("id")
    .single()
    .throwOnError();
  await must(
    supabase.from("quiz_simulado_questions").insert(
      questionIds.map((qid, i) => ({ simulado_id: simulado.id, question_id: qid, ord: i })),
    ),
  );

  // Tentativa do Aluno 1 JÁ ENVIADA (acerta 4 de 5) — dá dados ao dashboard.
  // Busca as opções corretas e, para errar a última, escolhe uma incorreta.
  const { data: opts } = await supabase
    .from("quiz_options")
    .select("id, question_id, is_correct")
    .in("question_id", questionIds)
    .throwOnError();
  const chosen = questionIds.map((qid, idx) => {
    const ofQ = (opts ?? []).filter((o) => o.question_id === qid);
    const correct = ofQ.find((o) => o.is_correct);
    const wrong = ofQ.find((o) => !o.is_correct);
    // erra de propósito a última questão
    const pick = idx === questionIds.length - 1 ? wrong : correct;
    return { question_id: qid, option_id: pick?.id ?? null, is_correct: Boolean(pick?.is_correct) };
  });
  const correctCount = chosen.filter((c) => c.is_correct).length;
  const { data: attempt } = await supabase
    .from("quiz_attempts")
    .insert({
      simulado_id: simulado.id,
      student_id: studentIds[0],
      submitted_at: new Date().toISOString(),
      total_questions: questionIds.length,
      correct_count: correctCount,
      score: Math.round((correctCount / questionIds.length) * 100),
    })
    .select("id")
    .single()
    .throwOnError();
  await must(
    supabase.from("quiz_answers").insert(
      chosen.map((c) => ({
        attempt_id: attempt.id,
        question_id: c.question_id,
        selected_option_id: c.option_id,
        is_correct: c.is_correct,
      })),
    ),
  );
  console.log(`Simulado SAEP (demo) criado; Aluno 1 enviou (${correctCount}/${questionIds.length}).`);

  // -------- 3. SAP prático (assessment + rubrica + entrega + avaliação) --------
  const { data: sapAssign } = await supabase
    .from("assignments")
    .insert({ class_id: classId, class_unit_id: classUnitId, title: "SAP — Protótipo de Jogo (Demo)", kind: "sap_pratico" })
    .select("id")
    .single()
    .throwOnError();
  const { data: assessment } = await supabase
    .from("sap_assessments")
    .insert({
      assignment_id: sapAssign.id,
      class_unit_id: classUnitId,
      title: "SAP — Protótipo de Jogo (Demo)",
      description:
        "Reconstrua o protótipo do jogo conforme o caderno de prova: telas, gameplay, HUD, fim de jogo e plano de testes.",
      max_score: 10,
    })
    .select("id")
    .single()
    .throwOnError();

  // Rubrica (Unidade → Elemento → Critério → Item Sim/Não, com pontos e competência).
  const RUBRIC = [
    {
      code: "1",
      title: "Produzir elementos multimídia para jogos digitais",
      elements: [
        {
          code: "1.2",
          title: "Criar elementos multimídia para atender o escopo do projeto",
          criteria: [
            {
              code: "1.2.1",
              description: "Seguindo métodos, ferramentas e técnicas para criação de elementos 2D",
              items: [
                { code: "1.2.1.1", description: "Criou a Tela de Menu Principal (logo, fundo, botões Jogar/Controles/Sair).", points: 1, competency_id: comp.C3, knowledge_object_id: obj.E },
                { code: "1.2.1.2", description: "Criou a Tela de Gameplay com informações de jogador, inimigo e distância.", points: 1, competency_id: comp.C3, knowledge_object_id: obj.E },
              ],
            },
          ],
        },
      ],
    },
    {
      code: "2",
      title: "Desenvolver sistemas de jogos digitais",
      elements: [
        {
          code: "2.2",
          title: "Codificar sistemas de jogos digitais para atender o escopo do projeto",
          criteria: [
            {
              code: "2.2.1",
              description: "Utilizando linguagens de programação para desenvolvimento de jogos",
              items: [
                { code: "2.2.1.1", description: "Implementou o controle de vida do jogador.", points: 2, competency_id: comp.C6, knowledge_object_id: obj.G },
                { code: "2.2.1.2", description: "Implementou a movimentação do jogador.", points: 2, competency_id: comp.C6, knowledge_object_id: obj.G },
                { code: "2.2.1.3", description: "Implementou a condição de vitória e derrota.", points: 2, competency_id: comp.C6, knowledge_object_id: obj.F },
              ],
            },
          ],
        },
        {
          code: "2.3",
          title: "Testar jogos digitais para garantia da qualidade da entrega",
          criteria: [
            {
              code: "2.3.3",
              description: "Aplicando métodos e procedimentos de teste",
              items: [
                { code: "2.3.3.1", description: "Entregou plano de testes com ao menos três procedimentos executáveis.", points: 2, competency_id: comp.C7, knowledge_object_id: obj.S },
              ],
            },
          ],
        },
      ],
    },
  ];

  const itemByCode = {};
  for (let ui = 0; ui < RUBRIC.length; ui++) {
    const u = RUBRIC[ui];
    const { data: unitRow } = await supabase
      .from("sap_units")
      .insert({ assessment_id: assessment.id, code: u.code, title: u.title, ord: ui })
      .select("id")
      .single()
      .throwOnError();
    for (let ei = 0; ei < u.elements.length; ei++) {
      const e = u.elements[ei];
      const { data: elRow } = await supabase
        .from("sap_elements")
        .insert({ unit_id: unitRow.id, code: e.code, title: e.title, ord: ei })
        .select("id")
        .single()
        .throwOnError();
      for (let ci = 0; ci < e.criteria.length; ci++) {
        const c = e.criteria[ci];
        const { data: crRow } = await supabase
          .from("sap_criteria")
          .insert({ element_id: elRow.id, code: c.code, description: c.description, ord: ci })
          .select("id")
          .single()
          .throwOnError();
        const { data: itemRows } = await supabase
          .from("sap_items")
          .insert(
            c.items.map((it, ii) => ({
              criterion_id: crRow.id,
              code: it.code,
              description: it.description,
              points: it.points,
              competency_id: it.competency_id ?? null,
              knowledge_object_id: it.knowledge_object_id ?? null,
              ord: ii,
            })),
          )
          .select("id, code")
          .throwOnError();
        for (const r of itemRows ?? []) itemByCode[r.code] = r.id;
      }
    }
  }

  // Aluno 1: entregou e foi avaliado (atende quase tudo, menos um item).
  const naoAtende = new Set(["2.3.3.1"]); // não entregou o plano de testes
  const allItems = Object.entries(itemByCode); // [code, id]
  const totalPoints = RUBRIC.flatMap((u) => u.elements)
    .flatMap((e) => e.criteria)
    .flatMap((c) => c.items)
    .reduce((s, it) => s + it.points, 0);
  const pointsByCode = Object.fromEntries(
    RUBRIC.flatMap((u) => u.elements).flatMap((e) => e.criteria).flatMap((c) => c.items).map((it) => [it.code, it.points]),
  );
  const score = allItems.reduce((s, [code]) => s + (naoAtende.has(code) ? 0 : pointsByCode[code]), 0);

  const { data: evaluation } = await supabase
    .from("sap_evaluations")
    .insert({
      assessment_id: assessment.id,
      student_id: studentIds[0],
      submission_link: "https://aluno-demo.itch.io/prototipo-saep",
      submitted_at: new Date().toISOString(),
      score,
      max_score: totalPoints,
      feedback: "Bom protótipo! Faltou entregar o plano de testes — revise QA para a próxima.",
      evaluated_at: new Date().toISOString(),
    })
    .select("id")
    .single()
    .throwOnError();
  await must(
    supabase.from("sap_item_marks").insert(
      allItems.map(([code, id]) => ({
        evaluation_id: evaluation.id,
        item_id: id,
        met: !naoAtende.has(code),
        justification: naoAtende.has(code) ? "Plano de testes não foi entregue." : null,
      })),
    ),
  );

  // Aluno 2: só entregou (ainda não avaliado) — para testar a fila do professor.
  await must(
    supabase.from("sap_evaluations").insert({
      assessment_id: assessment.id,
      student_id: studentIds[1],
      submission_link: "https://aluno-demo2.itch.io/prototipo-saep",
      submitted_at: new Date().toISOString(),
    }),
  );

  console.log(`SAP prático (demo) criado; Aluno 1 avaliado (${score}/${totalPoints}), Aluno 2 só entregou.`);
}

async function main() {
  loadEnv();

  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  console.log("Resetando dados demo...");
  await resetDemoData(supabase);

  if (RESET_USERS) {
    console.log("Resetando usuarios demo...");
    await resetDemoUsers(supabase);
  }

  console.log("Criando seed demo...");
  await seedDemo(supabase);

  console.log("");
  console.log("=============================================================");
  console.log(" SEED COMPLETO — pronto para testar tudo");
  console.log("=============================================================");
  console.log("");
  console.log("LOGINS (entre em /entrar):");
  console.log(`  ADMIN      : ${ADMIN_USER.email} / ${ADMIN_PASSWORD}`);
  console.log(`  COORDENADOR: ${COORD_USER.email} / ${DEMO_PASSWORD} (ve/gerencia todas as turmas)`);
  console.log(`  PROFESSOR  : prof.demo@codequest.dev / ${DEMO_PASSWORD} (dono)`);
  console.log(`  PROFESSOR 2: prof2.demo@codequest.dev / ${DEMO_PASSWORD} (co-docencia)`);
  console.log(`  ALUNO 1    : aluno1.demo@codequest.dev / ${DEMO_PASSWORD}`);
  console.log(`               (tambem loga com aluno1.pessoal@gmail.com)`);
  console.log(`  ALUNO 2    : aluno2.demo@codequest.dev / ${DEMO_PASSWORD}`);
  console.log("");
  console.log("COMO ADMIN:");
  console.log("  - Painel admin: numeros da instituicao + criar professor/admin.");
  console.log("  - Relatorios: Institucional, Professores (frequencia/plano/execucao),");
  console.log("    Turmas, Alunos (em risco), SAEP/SAP (por competencia + drill-down),");
  console.log("    Projetos Integradores (progresso). Exportar CSV + Imprimir/PDF.");
  console.log("  - Configuracoes: mudar corte de nota/frequencia e ver reclassificar.");
  console.log("");
  console.log("COMO PROFESSOR (Turma Demo): frequencia, atividades, SAEP, SAP, projeto.");
  console.log("COMO ALUNO: responder simulado, entregar SAP, ver notas/frequencia.");
  console.log("");
  console.log("NOVOS EXERCICIOS CRIATIVOS (lista 'Atividades Criativas (Demo)'):");
  console.log("  Pixel Art, Vetor, Arte Digital e Blocos (Celeste). Entre como ALUNO,");
  console.log("  abra a lista e teste cada editor; entregue; corrija como PROFESSOR.");
  console.log("");
  console.log("CATALOGO DE EXERCICIOS (menu Exercicios, como PROFESSOR):");
  console.log("  6 exercicios 'Catalogo: ...' dos 2 professores, vinculados a UCs e");
  console.log("  alguns marcados de prova. Teste filtros (curso/UC/dificuldade/prova/");
  console.log("  autor) e o botao 'Usar em uma turma'. (Requer migration 0054 aplicada.)");
  console.log("");
  console.log(`Codigo da turma (entrar como aluno novo): ${INVITE_CODE}`);
}

main().catch((error) => {
  console.error("");
  console.error("Falha ao aplicar seed demo:");
  console.error(error.message ?? error);
  process.exit(1);
});

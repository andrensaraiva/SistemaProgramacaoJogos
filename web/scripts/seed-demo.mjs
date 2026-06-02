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
    display_name: "Prof Demo",
    role: "professor",
  },
  {
    email: "aluno1.demo@codequest.dev",
    display_name: "Aluno Demo 1",
    role: "aluno",
  },
  {
    email: "aluno2.demo@codequest.dev",
    display_name: "Aluno Demo 2",
    role: "aluno",
  },
];

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
  const existing = await findUserByEmail(supabase, user.email);

  if (!existing) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        display_name: user.display_name,
        role: user.role,
      },
    });
    if (error) throw error;
    await upsertProfile(supabase, data.user.id, user);
    return data.user.id;
  }

  const { error } = await supabase.auth.admin.updateUserById(existing.id, {
    password: DEMO_PASSWORD,
    user_metadata: {
      display_name: user.display_name,
      role: user.role,
    },
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
  const teacherId = await ensureUser(supabase, USERS[0]);
  const studentIds = [
    await ensureUser(supabase, USERS[1]),
    await ensureUser(supabase, USERS[2]),
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
  const { classUnitId, matrix } = await seedCurriculo(supabase, {
    teacherId,
    classId: classroom.id,
    studentIds,
  });

  // ---- Trabalhos não-código: apresentação + modelo de resposta + grupo ----
  await seedTrabalhos(supabase, { teacherId, classId: classroom.id, studentIds });

  // ---- SAEP (simulado teórico) + SAP (prático) na UC ----
  await seedSaepSap(supabase, {
    teacherId,
    classId: classroom.id,
    classUnitId,
    studentIds,
    matrix,
  });
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

  return { classUnitId: classUnit.id, matrix };
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
  console.log("Seed demo pronto.");
  console.log(`Professor: ${USERS[0].email} / ${DEMO_PASSWORD}`);
  console.log(`Aluno 1:   ${USERS[1].email} / ${DEMO_PASSWORD}`);
  console.log(`Aluno 2:   ${USERS[2].email} / ${DEMO_PASSWORD}`);
  console.log(`Codigo da turma: ${INVITE_CODE}`);
}

main().catch((error) => {
  console.error("");
  console.error("Falha ao aplicar seed demo:");
  console.error(error.message ?? error);
  process.exit(1);
});

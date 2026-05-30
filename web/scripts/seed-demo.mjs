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

  // Curso demo (cascateia módulos/UCs/planos/blocos; class_units/attendance já
  // foram removidos junto com a turma acima).
  await must(supabase.from("courses").delete().eq("name", COURSE.name));

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

  // ---- Camada curricular: curso + plano de ensino demo + frequência ----
  await seedCurriculo(supabase, { teacherId, classId: classroom.id, studentIds });
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

  // Frequência de exemplo: 3 aulas com marcações variadas.
  const day = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toISOString().slice(0, 10);
  };
  const sessionsSpec = [
    { n: 1, date: day(14), label: "Aula 01 — Lógica" },
    { n: 2, date: day(7), label: "Aula 02 — Tipos" },
    { n: 3, date: day(0), label: "Aula 03 — Controle de fluxo" },
  ];
  const { data: sessions } = await supabase
    .from("attendance_sessions")
    .insert(
      sessionsSpec.map((s) => ({
        class_unit_id: classUnit.id,
        session_number: s.n,
        date: s.date,
        label: s.label,
      })),
    )
    .select("id, session_number")
    .throwOnError();

  // Aluno 1 sempre presente; Aluno 2 com 1 atraso e 1 falta.
  const status = {
    1: { [studentIds[0]]: "presente", [studentIds[1]]: "presente" },
    2: { [studentIds[0]]: "presente", [studentIds[1]]: "atraso" },
    3: { [studentIds[0]]: "presente", [studentIds[1]]: "falta" },
  };
  const marks = [];
  for (const s of sessions) {
    for (const studentId of studentIds) {
      marks.push({
        session_id: s.id,
        student_id: studentId,
        status: status[s.session_number][studentId],
      });
    }
  }
  await must(supabase.from("attendance_marks").insert(marks));

  console.log("Plano de ensino demo + frequência de exemplo criados.");
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

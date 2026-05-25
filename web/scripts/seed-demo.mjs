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
];

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
        language: "csharp",
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

  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .insert({
      class_id: classroom.id,
      title: "Lista Demo",
      kind: "lista",
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

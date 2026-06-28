// =============================================================================
// Seed de EXPERIÊNCIA DO ALUNO — deixa pronto pra testar tudo o que foi feito:
// jornada da UC, exemplo do professor, modo prova (lockdown), grupos, e
// exercícios prontos pra só ENTREGAR e ver a notificação.
// =============================================================================
// Complementa o seed-demo (que cria turma/UCs/exercícios). Aqui adicionamos:
//   - exercícios de ENTREGA (apresentação/modelo) com `example` preenchido,
//     numa lista nova — o aluno entrega em 1 clique e vê a notificação
//   - uma PROVA (kind='prova') com exercícios de entrega pra testar o lockdown
//   - uma atividade EM GRUPO com os alunos demo no mesmo grupo
//   - notificações in-app de exemplo (pro sino mostrar algo)
//   - enche a gamificação dos alunos (chama o mesmo efeito do seed:gamificacao)
//
//   node scripts/seed-experiencia.mjs          → aplica (idempotente)
//
// Pré-requisito: npm run seed:demo (cria a Turma Demo + alunos).
// =============================================================================

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const ENV_PATH = resolve(ROOT, ".env.local");
const CLASS_NAME = "Turma Demo";

function loadEnv() {
  const raw = readFileSync(ENV_PATH, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
}
function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta ${name} em .env.local`);
  return v;
}

// Exercícios de ENTREGA (não-código) — o aluno entrega em 1 clique. Cada um tem
// um `example` pra você ver o painel "💡 Exemplo do professor".
const ENTREGAS = [
  {
    title: "Entrega: Conte sobre seu jogo favorito",
    exercise_type: "modelo_resposta",
    description:
      "Escreva um parágrafo sobre o seu jogo favorito e o que te inspira nele como futuro dev.",
    response_template: "Meu jogo favorito é ___ porque ___. O que mais admiro tecnicamente é ___.",
    example:
      "Exemplo: Meu jogo favorito é Hollow Knight porque a movimentação é precisa. Tecnicamente admiro o sistema de animação por estados.",
  },
  {
    title: "Entrega: Link do seu protótipo",
    exercise_type: "apresentacao",
    description: "Cole o link de um protótipo, vídeo ou slide do seu projeto.",
    example: "Exemplo de link válido: https://drive.google.com/seu-prototipo",
  },
];

// Exercícios da PROVA (entrega rápida, pra focar no lockdown e não no Piston).
const PROVA_EXS = [
  {
    title: "Prova Q1: Defina variável e tipo",
    exercise_type: "modelo_resposta",
    description: "Explique com suas palavras o que é uma variável e dê um exemplo em C#.",
    response_template: "Uma variável é ___. Exemplo: int vidas = 3;",
  },
  {
    title: "Prova Q2: O que é um laço de repetição?",
    exercise_type: "modelo_resposta",
    description: "Explique para que serve um laço (for/while) num jogo.",
    response_template: "Um laço serve para ___. Num jogo, usaria para ___.",
  },
];

// Atividade EM GRUPO.
const GRUPO_EX = {
  title: "Trabalho em grupo: ideia de jogo",
  exercise_type: "modelo_resposta",
  description: "Em grupo, descrevam a ideia central do jogo de vocês (gênero, mecânica, objetivo).",
  response_template: "Nosso jogo é um ___ onde o jogador ___. O diferencial é ___.",
  example: "Exemplo: um roguelike onde o jogador controla o tempo. Diferencial: cada morte muda o mapa.",
};

async function getClassAndPeople(supabase) {
  const { data: cls } = await supabase
    .from("classes")
    .select("id, owner_id")
    .eq("name", CLASS_NAME)
    .maybeSingle();
  if (!cls) throw new Error(`Turma "${CLASS_NAME}" não existe — rode 'npm run seed:demo' antes.`);

  const { data: membros } = await supabase
    .from("class_members")
    .select("student:profiles!student_id(id, display_name)")
    .eq("class_id", cls.id);
  const students = (membros ?? []).map((m) => m.student);

  return { classId: cls.id, teacherId: cls.owner_id, students };
}

async function criarExercicio(supabase, teacherId, ex) {
  const { data, error } = await supabase
    .from("exercises")
    .insert({
      author_id: teacherId,
      title: ex.title,
      description: ex.description,
      starter_code: "",
      language: "csharp",
      exercise_type: ex.exercise_type,
      response_template: ex.response_template ?? null,
      example: ex.example ?? null,
      is_group: ex.is_group ?? false,
      is_public: false,
      xp_reward: 0,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function criarAssignment(supabase, classId, classUnitId, title, kind, exerciseIds, dueInDays) {
  const due = dueInDays != null ? new Date(Date.now() + dueInDays * 86400000).toISOString() : null;
  const { data: a, error } = await supabase
    .from("assignments")
    .insert({ class_id: classId, class_unit_id: classUnitId, title, kind, due_at: due })
    .select("id")
    .single();
  if (error) throw error;
  await supabase.from("assignment_exercises").insert(
    exerciseIds.map((exercise_id, i) => ({ assignment_id: a.id, exercise_id, ord: i + 1 })),
  );
  return a.id;
}

async function main() {
  loadEnv();
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { classId, teacherId, students } = await getClassAndPeople(supabase);
  if (students.length === 0) throw new Error("Turma sem alunos — rode o seed:demo.");
  const aluno1 = students[0];
  console.log(`Turma Demo: ${classId} · ${students.length} aluno(s).`);

  // Limpa o que este seed criou antes (idempotência por título), pra não duplicar.
  const titulos = [
    ...ENTREGAS.map((e) => e.title),
    ...PROVA_EXS.map((e) => e.title),
    GRUPO_EX.title,
  ];
  await supabase.from("exercises").delete().in("title", titulos);
  for (const t of ["Atividades de entrega (demo)", "Prova Demo", "Trabalho em grupo (demo)"]) {
    const { data: old } = await supabase.from("assignments").select("id").eq("class_id", classId).eq("title", t);
    for (const a of old ?? []) await supabase.from("assignments").delete().eq("id", a.id);
  }

  // Uma UC pra pendurar as atividades (usa a primeira UC da turma, se houver).
  const { data: cu } = await supabase
    .from("class_units")
    .select("id")
    .eq("class_id", classId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  const classUnitId = cu?.id ?? null;

  // 1) Lista de ENTREGAS (com exemplo do professor) — entregar em 1 clique.
  const entregaIds = [];
  for (const ex of ENTREGAS) entregaIds.push(await criarExercicio(supabase, teacherId, ex));
  await criarAssignment(supabase, classId, classUnitId, "Atividades de entrega (demo)", "lista", entregaIds, 5);
  console.log(`✓ Lista "Atividades de entrega (demo)" com ${entregaIds.length} exercícios (com exemplo do professor).`);

  // 2) PROVA — pra testar o lockdown (sair da tela = entrega).
  const provaIds = [];
  for (const ex of PROVA_EXS) provaIds.push(await criarExercicio(supabase, teacherId, ex));
  await criarAssignment(supabase, classId, classUnitId, "Prova Demo", "prova", provaIds, 2);
  console.log(`✓ "Prova Demo" (modo prova) com ${provaIds.length} questões.`);

  // 3) GRUPO — atividade em grupo + garante os alunos no mesmo grupo.
  const grupoExId = await criarExercicio(supabase, teacherId, { ...GRUPO_EX, is_group: true });
  await criarAssignment(supabase, classId, classUnitId, "Trabalho em grupo (demo)", "lista", [grupoExId], 7);

  // Garante um grupo "Equipe Demo" com todos os alunos da turma.
  let { data: grupo } = await supabase
    .from("class_groups")
    .select("id")
    .eq("class_id", classId)
    .eq("name", "Equipe Demo")
    .maybeSingle();
  if (!grupo) {
    const { data: g } = await supabase
      .from("class_groups")
      .insert({ class_id: classId, name: "Equipe Demo" })
      .select("id")
      .single();
    grupo = g;
  }
  for (const s of students) {
    await supabase
      .from("class_group_members")
      .upsert({ group_id: grupo.id, student_id: s.id }, { onConflict: "group_id,student_id" });
  }
  console.log(`✓ "Trabalho em grupo (demo)" + grupo "Equipe Demo" com ${students.length} integrante(s).`);

  // 4) Notificações de exemplo pro sino do Aluno 1.
  await supabase.from("notifications").delete().eq("recipient_id", aluno1.id).eq("type", "demo");
  await supabase.from("notifications").insert([
    {
      recipient_id: aluno1.id,
      type: "demo",
      title: "Nova atividade disponível",
      body: "A lista 'Atividades de entrega (demo)' foi publicada na sua turma.",
      link: `/turmas/${classId}/ucs/${classUnitId ?? ""}`,
    },
    {
      recipient_id: aluno1.id,
      type: "demo",
      title: "Prova marcada",
      body: "A 'Prova Demo' está disponível. Boa sorte!",
    },
  ]);
  console.log("✓ 2 notificações de exemplo pro sino do Aluno 1.");

  console.log("");
  console.log("=============================================================");
  console.log(" EXPERIÊNCIA DO ALUNO — pronta pra testar tudo");
  console.log("=============================================================");
  console.log("Entre como aluno1.demo@codequest.dev / password123 e veja:");
  console.log("  • Turma Demo → UC: jornada (Aprenda → Pratique)");
  console.log("  • 'Atividades de entrega (demo)': entregue em 1 clique → notificação + exemplo do professor");
  console.log("  • 'Prova Demo': Iniciar prova → troque de aba pra ver a entrega automática");
  console.log("  • 'Trabalho em grupo (demo)': painel 'Meu grupo' com os colegas");
  console.log("  • Sino (topo): 2 notificações novas");
  console.log("");
  console.log("Dica: rode também 'npm run seed:gamificacao' pra encher painel/perfil (XP, streak, moedas).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

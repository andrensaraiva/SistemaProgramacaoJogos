// =============================================================================
// Seed de GAMIFICAÇÃO — enche o painel do aluno pra testar fácil.
// =============================================================================
// Dá aos alunos demo um estado "cheio" de gamificação: XP/nível alto, ofensiva
// (streak) ativa, moedas, e conquistas desbloqueadas. Também cria uns alunos
// extras só pra povoar o ranking. NÃO mexe em turmas/UCs/exercícios — pra isso
// use o seed-demo. Pode rodar quantas vezes quiser (idempotente).
//
//   node scripts/seed-gamificacao.mjs           → aplica
//   node scripts/seed-gamificacao.mjs --reset    → zera a gamificação dos alunos
//
// Depende de: usuários demo já criados (rode `npm run seed:demo` antes).
// =============================================================================

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const ENV_PATH = resolve(ROOT, ".env.local");
const RESET = process.argv.includes("--reset");

const DEMO_PASSWORD = "password123";

// Catálogo de badges (mesmos ids do seed de gamificação do banco). Caso o
// catálogo esteja vazio, garantimos a existência destes.
const BADGES = [
  { id: "first_green", title: "Primeira Vitoria", description: "Sua primeira submissao aprovada" },
  { id: "streak_7", title: "Semana Consistente", description: "Resolveu pelo menos um exercicio por 7 dias seguidos" },
  { id: "no_paste", title: "Mao Propria", description: "Resolveu 10 exercicios sem nenhum paste" },
];

// Estado de gamificação por aluno. `daysAgoActive` = quantos dias atrás foi a
// última atividade (0 = hoje), pra a chama do streak aparecer acesa.
const STUDENT_STATE = {
  "aluno1.demo@codequest.dev": {
    xp: 1240, // nível 13
    coins_bonus: 35,
    coins_spent: 0,
    current_streak: 12,
    longest_streak: 18,
    daysAgoActive: 0,
    badges: ["first_green", "streak_7", "no_paste"],
    duel_rating: 1180,
    duel_wins: 9,
    duel_losses: 3,
  },
  "aluno2.demo@codequest.dev": {
    xp: 530, // nível 6
    coins_bonus: 0,
    coins_spent: 0,
    current_streak: 3,
    longest_streak: 7,
    daysAgoActive: 0,
    badges: ["first_green"],
    duel_rating: 1020,
    duel_wins: 4,
    duel_losses: 6,
  },
};

// Alunos extras SÓ pra ter um ranking competitivo (sem turma/login relevante).
const EXTRA_STUDENTS = [
  { email: "ranking1.demo@codequest.dev", display_name: "Bianca Pereira", xp: 2100 },
  { email: "ranking2.demo@codequest.dev", display_name: "Caio Nogueira", xp: 1760 },
  { email: "ranking3.demo@codequest.dev", display_name: "Duda Martins", xp: 880 },
  { email: "ranking4.demo@codequest.dev", display_name: "Enzo Tavares", xp: 410 },
];

function loadEnv() {
  const raw = readFileSync(ENV_PATH, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    process.env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name} em .env.local`);
  return value;
}

function levelFromXp(xp) {
  return Math.max(1, Math.floor(xp / 100) + 1);
}

/** Data YYYY-MM-DD de N dias atrás. */
function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function listAllUsers(supabase) {
  const users = [];
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
    page += 1;
  }
  return users;
}

async function ensureExtraStudent(supabase, existing, student) {
  const found = existing.find((u) => u.email?.toLowerCase() === student.email.toLowerCase());
  if (found) return found.id;

  const { data, error } = await supabase.auth.admin.createUser({
    email: student.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: student.display_name, role: "aluno" },
  });
  if (error) throw error;

  await supabase.from("profiles").upsert(
    { id: data.user.id, role: "aluno", display_name: student.display_name },
    { onConflict: "id" },
  );
  return data.user.id;
}

async function main() {
  loadEnv();
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const users = await listAllUsers(supabase);
  const byEmail = (email) =>
    users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  const demoEmails = Object.keys(STUDENT_STATE);

  if (RESET) {
    console.log("Zerando gamificação dos alunos demo...");
    for (const email of demoEmails) {
      const u = byEmail(email);
      if (!u) continue;
      await supabase
        .from("profiles")
        .update({
          xp: 0,
          level: 1,
          coins_bonus: 0,
          coins_spent: 0,
          current_streak: 0,
          longest_streak: 0,
          last_active_on: null,
        })
        .eq("id", u.id);
      await supabase.from("user_badges").delete().eq("user_id", u.id);
      console.log(`  ${email}: zerado.`);
    }
    console.log("Pronto. (Alunos extras de ranking NÃO foram removidos.)");
    return;
  }

  // 1. Garante o catálogo de badges.
  await supabase.from("badges").upsert(BADGES, { onConflict: "id" });

  // 2. Estado dos alunos demo principais.
  console.log("Enchendo o painel dos alunos demo...");
  for (const [email, st] of Object.entries(STUDENT_STATE)) {
    const u = byEmail(email);
    if (!u) {
      console.log(`  ${email}: NÃO encontrado — rode 'npm run seed:demo' antes. Pulando.`);
      continue;
    }

    await supabase
      .from("profiles")
      .update({
        xp: st.xp,
        level: levelFromXp(st.xp),
        coins_bonus: st.coins_bonus,
        coins_spent: st.coins_spent,
        current_streak: st.current_streak,
        longest_streak: st.longest_streak,
        last_active_on: isoDaysAgo(st.daysAgoActive),
        duel_rating: st.duel_rating,
        duel_wins: st.duel_wins,
        duel_losses: st.duel_losses,
      })
      .eq("id", u.id);

    if (st.badges?.length) {
      await supabase.from("user_badges").upsert(
        st.badges.map((badge_id) => ({ user_id: u.id, badge_id })),
        { onConflict: "user_id,badge_id" },
      );
    }

    console.log(
      `  ${email}: nível ${levelFromXp(st.xp)}, streak ${st.current_streak}🔥, ${st.badges.length} conquista(s).`,
    );
  }

  // 3. Alunos extras pra povoar o ranking.
  console.log("Povoando o ranking com alunos extras...");
  for (const student of EXTRA_STUDENTS) {
    const id = await ensureExtraStudent(supabase, users, student);
    await supabase
      .from("profiles")
      .update({ xp: student.xp, level: levelFromXp(student.xp) })
      .eq("id", id);
    console.log(`  ${student.display_name}: ${student.xp} XP (nível ${levelFromXp(student.xp)}).`);
  }

  console.log("");
  console.log("=============================================================");
  console.log(" PAINEL DO ALUNO CHEIO — pronto pra testar a gamificação");
  console.log("=============================================================");
  console.log("");
  console.log("Entre como aluno e veja /painel e /ranking:");
  console.log(`  ALUNO 1 (cheio) : aluno1.demo@codequest.dev / ${DEMO_PASSWORD}`);
  console.log(`  ALUNO 2 (médio) : aluno2.demo@codequest.dev / ${DEMO_PASSWORD}`);
  console.log("");
  console.log("Pra reverter: node scripts/seed-gamificacao.mjs --reset");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// =============================================================================
// Seed de identidades — Celeste Academy
// =============================================================================
// Cria o ADMIN MASTER pronto para logar (sem passar pelo primeiro acesso) e
// imprime os dados de teste para você criar manualmente um professor, uma turma
// e importar uma lista de alunos.
//
// Uso (em web/):  node scripts/seed-identidades.mjs
// Requer .env.local com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
// Idempotente: rodar de novo apenas reafirma o admin (mesma senha).
// =============================================================================

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const ENV_PATH = resolve(ROOT, ".env.local");

// -----------------------------------------------------------------------------
// Admin master
// -----------------------------------------------------------------------------
const ADMIN = {
  email: "admin@celeste.academy",
  password: "Admin@2026",
  display_name: "Admin Master",
};

function loadEnv() {
  const raw = readFileSync(ENV_PATH, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    process.env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name} em .env.local`);
  return value;
}

async function findUserByEmail(supabase, email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 1000) return null;
    page += 1;
  }
}

async function ensureAdmin(supabase) {
  const metadata = {
    display_name: ADMIN.display_name,
    role: "admin",
    institutional_email: ADMIN.email,
    // Admin master entra direto — não passa pelo wizard de primeiro acesso.
    must_change_password: false,
    profile_completed: true,
  };

  const existing = await findUserByEmail(supabase, ADMIN.email);
  let id;
  if (!existing) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN.email,
      password: ADMIN.password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    id = data.user.id;
  } else {
    id = existing.id;
    const { error } = await supabase.auth.admin.updateUserById(id, {
      password: ADMIN.password,
      user_metadata: metadata,
    });
    if (error) throw error;
  }

  // Garante o perfil correto (o trigger cobre a criação; aqui reforçamos a role
  // e as flags caso a conta já existisse com outro estado).
  const { error: pErr } = await supabase
    .from("profiles")
    .update({
      role: "admin",
      display_name: ADMIN.display_name,
      institutional_email: ADMIN.email,
      must_change_password: false,
      profile_completed: true,
    })
    .eq("id", id);
  if (pErr) throw pErr;

  return id;
}

async function main() {
  loadEnv();
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  console.log("Criando/atualizando admin master...");
  await ensureAdmin(supabase);

  console.log("\n=============================================================");
  console.log(" CELESTE ACADEMY — pronto para testar");
  console.log("=============================================================\n");

  console.log("1) ADMIN MASTER (já pode logar em /entrar):");
  console.log(`     e-mail : ${ADMIN.email}`);
  console.log(`     senha  : ${ADMIN.password}\n`);

  console.log("2) PROFESSOR para você criar no painel /admin (1 a 1):");
  console.log("     Nome               : Maria Instrutora");
  console.log("     E-mail institucional: maria.instrutora@celeste.academy");
  console.log("     E-mail pessoal      : maria.pessoal@gmail.com");
  console.log("   -> anote a SENHA TEMPORÁRIA que o painel mostrar; logue com ela");
  console.log("      e conclua o primeiro acesso (troca de senha + perfil).\n");

  console.log("3) TURMA para o professor criar (em /turmas/nova):");
  console.log('     Nome: "Turma de Teste 2026"\n');

  console.log("4) ALUNOS para importar em massa (cole na aba Colar/CSV de");
  console.log("   /turmas/[id]/alunos). Formato: Nome, institucional, pessoal:\n");
  console.log(LISTA_ALUNOS);
  console.log("\n   -> o painel mostra uma SENHA TEMPORÁRIA por aluno. Anote e");
  console.log("      teste logar com o e-mail institucional E com o pessoal.\n");

  console.log("Tudo pronto. ✦");
}

const LISTA_ALUNOS = [
  "Ana Beatriz Souza, ana.souza@celeste.academy, ana.souza@gmail.com",
  "Bruno Carvalho Lima, bruno.lima@celeste.academy, bruno.lima@outlook.com",
  "Carla Mendes Rocha, carla.rocha@celeste.academy, carla.rocha@gmail.com",
  "Diego Ferreira Alves, diego.alves@celeste.academy",
  "Eduarda Nunes Pinto, eduarda.pinto@celeste.academy, duda.pinto@hotmail.com",
  "Felipe Gomes Barros, felipe.barros@celeste.academy, felipe.barros@gmail.com",
].join("\n");

main().catch((err) => {
  console.error("\nFALHOU:", err.message ?? err);
  process.exit(1);
});

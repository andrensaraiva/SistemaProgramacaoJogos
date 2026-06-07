import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// -----------------------------------------------------------------------------
// Estatísticas institucionais para o dashboard do admin. Apenas contagens leves
// (count exact + head), no padrão de lib/auth/dal contarNaoLidas. Service-role
// porque o admin precisa enxergar a instituição inteira.
// -----------------------------------------------------------------------------

export type AdminStats = {
  professores: number;
  professoresSuspensos: number;
  alunos: number;
  alunosSuspensos: number;
  turmas: number;
  cursos: number;
  aguardandoPrimeiroAcesso: number;
  resetsPendentes: number;
};

async function headCount(
  q: PromiseLike<{ count: number | null }>,
): Promise<number> {
  return (await q).count ?? 0;
}

export async function getAdminStats(): Promise<AdminStats> {
  const admin = createAdminClient();

  const [
    professores,
    professoresSuspensos,
    alunos,
    alunosSuspensos,
    turmas,
    cursos,
    aguardandoPrimeiroAcesso,
    resetsPendentes,
  ] = await Promise.all([
    headCount(
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "professor"),
    ),
    headCount(
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "professor")
        .not("disabled_at", "is", null),
    ),
    headCount(
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "aluno"),
    ),
    headCount(
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "aluno")
        .not("disabled_at", "is", null),
    ),
    headCount(admin.from("classes").select("id", { count: "exact", head: true })),
    headCount(admin.from("courses").select("id", { count: "exact", head: true })),
    headCount(
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("profile_completed", false)
        .neq("role", "admin"),
    ),
    headCount(
      admin
        .from("password_reset_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pendente"),
    ),
  ]);

  return {
    professores,
    professoresSuspensos,
    alunos,
    alunosSuspensos,
    turmas,
    cursos,
    aguardandoPrimeiroAcesso,
    resetsPendentes,
  };
}

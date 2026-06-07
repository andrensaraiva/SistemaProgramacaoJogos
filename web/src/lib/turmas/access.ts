import "server-only";

import { redirect } from "next/navigation";

import { getProfile } from "@/lib/auth/dal";
import { homeDe } from "@/lib/auth/permissions";
import type { Role } from "@/lib/features";
import { createAdminClient } from "@/lib/supabase/admin";

// =============================================================================
// Acesso à turma — fonte ÚNICA de "posso gerenciar esta turma?".
// =============================================================================
// Antes cada tela recalculava de um jeito (umas só owner, outras +admin), o que
// fazia co-docente e coordenador PERDEREM os controles em várias telas internas.
// Aqui a regra fica num lugar só, espelhando o RLS is_class_owner (dono OU
// co-docente OU coordenador OU admin). Ações destrutivas usam `ehDono`.

export type AcessoTurma = {
  ehDono: boolean; // dono da turma — único que exclui/regenera convite
  ehCoDocente: boolean; // co-professor (class_teachers)
  ehGestao: boolean; // coordenador ou admin (gestão ampla)
  podeGerenciar: boolean; // ehDono || ehCoDocente || ehGestao
};

type MinimalProfile = { id: string; role: string };

/**
 * Resolve o acesso do `profile` à turma `classId`. Se o chamador já tem o
 * `owner_id` da turma (vem no fetch da página), passe-o para evitar uma query.
 */
export async function getAcessoTurma(
  classId: string,
  profile: MinimalProfile,
  ownerId?: string | null,
): Promise<AcessoTurma> {
  const role = profile.role as Role;
  const ehGestao = role === "coordenador" || role === "admin";

  const admin = createAdminClient();

  let owner = ownerId;
  if (owner === undefined) {
    const { data } = await admin.from("classes").select("owner_id").eq("id", classId).single();
    owner = data?.owner_id ?? null;
  }
  const ehDono = owner === profile.id;

  // Co-docência só importa se ainda não é dono/gestão (evita query à toa).
  let ehCoDocente = false;
  if (!ehDono && !ehGestao) {
    const { data: co } = await admin
      .from("class_teachers")
      .select("teacher_id")
      .eq("class_id", classId)
      .eq("teacher_id", profile.id)
      .maybeSingle();
    ehCoDocente = !!co;
  }

  return { ehDono, ehCoDocente, ehGestao, podeGerenciar: ehDono || ehCoDocente || ehGestao };
}

/**
 * Açúcar para páginas de GESTÃO da turma (alunos, editar, listas/nova): exige
 * que o usuário possa gerenciar; senão redireciona para a página da turma (ou
 * a home do papel se nem isso). Devolve { profile, acesso }.
 */
export async function requireGerenciarTurma(classId: string): Promise<{
  profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>;
  acesso: AcessoTurma;
}> {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  const acesso = await getAcessoTurma(classId, profile);
  if (!acesso.podeGerenciar) redirect(homeDe(profile.role as Role));
  return { profile, acesso };
}

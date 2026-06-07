"use server";

import { revalidatePath } from "next/cache";

import { getProfile } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAcessoTurma } from "@/lib/turmas/access";

// Co-docência: quem GERENCIA a turma (dono, co-docente, coordenador ou admin)
// gerencia os co-professores e o responsável por cada UC. Co-professores ganham
// acesso à turma via os helpers de RLS estendidos (ver migration 0031).

export type CoDocenciaState = { ok?: false; message?: string } | { ok: true; message: string } | undefined;

/** Exige que o usuário possa gerenciar a turma. Devolve { id } do ator. */
async function requireGestaoTurma(classId: string): Promise<{ id: string }> {
  const profile = await getProfile();
  if (!profile) throw new Error("Sem sessão.");
  const { podeGerenciar } = await getAcessoTurma(classId, profile);
  if (!podeGerenciar) {
    throw new Error("Você não gerencia esta turma.");
  }
  return { id: profile.id };
}

export async function adicionarProfessor(
  _prev: CoDocenciaState,
  formData: FormData,
): Promise<CoDocenciaState> {
  const classId = String(formData.get("class_id") ?? "");
  const teacherId = String(formData.get("teacher_id") ?? "");
  if (!classId || !teacherId) return { ok: false, message: "Dados incompletos." };

  let me;
  try {
    me = await requireGestaoTurma(classId);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sem permissão." };
  }

  const admin = createAdminClient();
  // Precisa ser um professor.
  const { data: prof } = await admin.from("profiles").select("role, display_name").eq("id", teacherId).single();
  if (!prof || (prof.role !== "professor" && prof.role !== "admin")) {
    return { ok: false, message: "Selecione um professor válido." };
  }
  // Não duplicar com o dono.
  const { data: turma } = await admin.from("classes").select("owner_id, name").eq("id", classId).single();
  if (turma?.owner_id === teacherId) {
    return { ok: false, message: "Este professor já é o dono da turma." };
  }

  const { error } = await admin
    .from("class_teachers")
    .upsert({ class_id: classId, teacher_id: teacherId, added_by: me.id }, { onConflict: "class_id,teacher_id" });
  if (error) return { ok: false, message: error.message };

  await admin.from("notifications").insert({
    recipient_id: teacherId,
    type: "co_docencia",
    title: "Você foi adicionado a uma turma",
    body: `Você agora também leciona na turma ${turma?.name ?? ""}.`,
    link: `/turmas/${classId}`,
  });

  revalidatePath(`/turmas/${classId}`);
  return { ok: true, message: `${prof.display_name} adicionado(a) à turma.` };
}

export async function removerProfessor(formData: FormData): Promise<void> {
  const classId = String(formData.get("class_id") ?? "");
  const teacherId = String(formData.get("teacher_id") ?? "");
  if (!classId || !teacherId) return;
  await requireGestaoTurma(classId);

  const admin = createAdminClient();
  await admin.from("class_teachers").delete().eq("class_id", classId).eq("teacher_id", teacherId);
  // Se era responsável por alguma UC, limpa (cai no dono).
  await admin.from("class_units").update({ teacher_id: null }).eq("class_id", classId).eq("teacher_id", teacherId);

  revalidatePath(`/turmas/${classId}`);
}

export async function definirResponsavelUc(
  _prev: CoDocenciaState,
  formData: FormData,
): Promise<CoDocenciaState> {
  const classId = String(formData.get("class_id") ?? "");
  const classUnitId = String(formData.get("class_unit_id") ?? "");
  const teacherId = String(formData.get("teacher_id") ?? ""); // "" = volta ao dono

  if (!classId || !classUnitId) return { ok: false, message: "Dados incompletos." };
  try {
    await requireGestaoTurma(classId);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sem permissão." };
  }

  const admin = createAdminClient();

  // O responsável precisa ser dono ou co-professor da turma.
  if (teacherId) {
    const { data: turma } = await admin.from("classes").select("owner_id").eq("id", classId).single();
    const isOwner = turma?.owner_id === teacherId;
    const { data: co } = await admin
      .from("class_teachers")
      .select("teacher_id")
      .eq("class_id", classId)
      .eq("teacher_id", teacherId)
      .maybeSingle();
    if (!isOwner && !co) {
      return { ok: false, message: "O responsável deve ser um professor da turma." };
    }
  }

  const { error } = await admin
    .from("class_units")
    .update({ teacher_id: teacherId || null })
    .eq("id", classUnitId)
    .eq("class_id", classId);
  if (error) return { ok: false, message: error.message };

  if (teacherId) {
    await admin.from("notifications").insert({
      recipient_id: teacherId,
      type: "responsavel_uc",
      title: "Você é o responsável por uma UC",
      body: "Você foi definido como responsável por uma unidade curricular.",
      link: `/turmas/${classId}/ucs`,
    });
  }

  revalidatePath(`/turmas/${classId}`);
  return { ok: true, message: "Responsável atualizado." };
}

/** Lista os professores da turma (dono + co-professores) para a UI. */
export async function listarProfessoresDaTurma(classId: string): Promise<
  { id: string; display_name: string; isOwner: boolean }[]
> {
  const admin = createAdminClient();
  const { data: turma } = await admin
    .from("classes")
    .select("owner_id, owner:profiles!owner_id(display_name)")
    .eq("id", classId)
    .single();
  const { data: cos } = await admin
    .from("class_teachers")
    .select("teacher:profiles!teacher_id(id, display_name)")
    .eq("class_id", classId);

  const list: { id: string; display_name: string; isOwner: boolean }[] = [];
  if (turma) {
    const owner = turma.owner as unknown as { display_name: string } | null;
    list.push({ id: turma.owner_id, display_name: owner?.display_name ?? "Dono", isOwner: true });
  }
  for (const c of cos ?? []) {
    const t = c.teacher as unknown as { id: string; display_name: string } | null;
    if (t) list.push({ id: t.id, display_name: t.display_name, isOwner: false });
  }
  return list;
}

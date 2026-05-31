"use server";

import { revalidatePath } from "next/cache";

import { isProfessor, verifySession } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

// Grupos de alunos por turma. Só o dono da turma gerencia. Verifica posse no
// código (admin client), como nas demais actions.

type ActionResult = { ok: true } | { ok: false; message: string };

async function ownsClass(classId: string, userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("classes")
    .select("owner_id")
    .eq("id", classId)
    .single();
  return data?.owner_id === userId;
}

export async function criarGrupo(
  classId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await verifySession();
  if (!(await isProfessor())) return { ok: false, message: "Apenas professores." };
  if (!(await ownsClass(classId, user.id)))
    return { ok: false, message: "Você não é dono desta turma." };

  const name = ((formData.get("name") as string) || "").trim();
  if (!name) return { ok: false, message: "Dê um nome ao grupo." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("class_groups")
    .insert({ class_id: classId, name });
  if (error) return { ok: false, message: `Erro: ${error.message}` };

  revalidatePath(`/turmas/${classId}/grupos`);
  return { ok: true };
}

export async function excluirGrupo(formData: FormData): Promise<void> {
  const { user } = await verifySession();
  if (!(await isProfessor())) return;
  const classId = formData.get("class_id") as string;
  const groupId = formData.get("group_id") as string;
  if (!(await ownsClass(classId, user.id))) return;
  const admin = createAdminClient();
  await admin.from("class_groups").delete().eq("id", groupId);
  revalidatePath(`/turmas/${classId}/grupos`);
}

// Define os membros de um grupo de uma vez (lista de student_ids).
export async function definirMembros(
  classId: string,
  groupId: string,
  studentIds: string[],
): Promise<ActionResult> {
  const { user } = await verifySession();
  if (!(await isProfessor())) return { ok: false, message: "Apenas professores." };
  if (!(await ownsClass(classId, user.id)))
    return { ok: false, message: "Você não é dono desta turma." };

  const admin = createAdminClient();
  // Confirma que o grupo é desta turma.
  const { data: g } = await admin
    .from("class_groups")
    .select("class_id")
    .eq("id", groupId)
    .single();
  if (!g || g.class_id !== classId)
    return { ok: false, message: "Grupo inválido." };

  // Substitui os membros: apaga e reinsere.
  await admin.from("class_group_members").delete().eq("group_id", groupId);
  if (studentIds.length) {
    const { error } = await admin
      .from("class_group_members")
      .insert(studentIds.map((sid) => ({ group_id: groupId, student_id: sid })));
    if (error) return { ok: false, message: `Erro: ${error.message}` };
  }

  revalidatePath(`/turmas/${classId}/grupos`);
  return { ok: true };
}

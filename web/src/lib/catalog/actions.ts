"use server";

import { revalidatePath } from "next/cache";

import { isProfessor, verifySession } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

// Aplicar um exercício do catálogo em uma turma: anexa a uma lista existente OU
// cria uma lista nova na turma e anexa. Reutiliza a mesma verificação de posse
// que lib/assignments/actions (turma → owner_id).

export type AplicarResult =
  | { ok: true; classId: string; assignmentId: string }
  | { ok: false; message: string };

async function ownsClass(classId: string, userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("classes")
    .select("owner_id")
    .eq("id", classId)
    .single();
  return data?.owner_id === userId;
}

async function nextOrd(assignmentId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("assignment_exercises")
    .select("ord")
    .eq("assignment_id", assignmentId)
    .order("ord", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.ord ?? 0) + 1;
}

export async function aplicarExercicio(
  formData: FormData,
): Promise<AplicarResult> {
  const { user } = await verifySession();
  if (!(await isProfessor())) {
    return { ok: false, message: "Apenas professores." };
  }

  const exerciseId = String(formData.get("exercise_id") ?? "");
  const classId = String(formData.get("class_id") ?? "");
  const assignmentId = String(formData.get("assignment_id") ?? ""); // lista existente
  const novaLista = String(formData.get("nova_lista") ?? "").trim(); // ou nova lista

  if (!exerciseId) return { ok: false, message: "Exercício inválido." };
  if (!classId) return { ok: false, message: "Escolha uma turma." };
  if (!assignmentId && !novaLista) {
    return { ok: false, message: "Escolha uma lista ou dê um nome para a nova." };
  }
  if (!(await ownsClass(classId, user.id))) {
    return { ok: false, message: "Você não gerencia esta turma." };
  }

  const admin = createAdminClient();
  let targetAssignment = assignmentId;

  // Criar lista nova, se pedido.
  if (!targetAssignment) {
    const { data: created, error: createErr } = await admin
      .from("assignments")
      .insert({ class_id: classId, title: novaLista, kind: "lista" })
      .select("id")
      .single();
    if (createErr || !created) {
      return { ok: false, message: `Não foi possível criar a lista: ${createErr?.message ?? "erro"}` };
    }
    targetAssignment = created.id;
  } else {
    // Confirma que a lista pertence à turma informada (evita anexar em turma alheia).
    const { data: a } = await admin
      .from("assignments")
      .select("class_id")
      .eq("id", targetAssignment)
      .single();
    if (a?.class_id !== classId) {
      return { ok: false, message: "Lista não pertence a esta turma." };
    }
  }

  const { error } = await admin.from("assignment_exercises").upsert(
    { assignment_id: targetAssignment, exercise_id: exerciseId, ord: await nextOrd(targetAssignment) },
    { onConflict: "assignment_id,exercise_id" },
  );
  if (error) {
    return { ok: false, message: `Não foi possível anexar: ${error.message}` };
  }

  revalidatePath(`/turmas/${classId}/listas/${targetAssignment}`);
  return { ok: true, classId, assignmentId: targetAssignment };
}

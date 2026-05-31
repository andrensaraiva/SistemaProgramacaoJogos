"use server";

import { revalidatePath } from "next/cache";

import { isProfessor, verifySession } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

// Anexar/remover exercícios a uma lista (assignment). Verifica posse da turma
// pelo caminho assignment → class.owner_id.

type ActionResult = { ok: true } | { ok: false; message: string };

async function ownsAssignment(assignmentId: string, userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("assignments")
    .select("id, class:classes!class_id(owner_id)")
    .eq("id", assignmentId)
    .single();
  const cls = data?.class as unknown as { owner_id: string } | undefined;
  return cls?.owner_id === userId;
}

export async function anexarExercicio(
  classId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await verifySession();
  if (!(await isProfessor())) return { ok: false, message: "Apenas professores." };

  const assignmentId = formData.get("assignment_id") as string;
  const exerciseId = formData.get("exercise_id") as string;
  if (!assignmentId || !exerciseId) {
    return { ok: false, message: "Selecione um exercício." };
  }
  if (!(await ownsAssignment(assignmentId, user.id))) {
    return { ok: false, message: "Você não é dono desta turma." };
  }

  const admin = createAdminClient();
  // Próxima ordem na lista.
  const { data: last } = await admin
    .from("assignment_exercises")
    .select("ord")
    .eq("assignment_id", assignmentId)
    .order("ord", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ord = (last?.ord ?? 0) + 1;

  const { error } = await admin
    .from("assignment_exercises")
    .upsert(
      { assignment_id: assignmentId, exercise_id: exerciseId, ord },
      { onConflict: "assignment_id,exercise_id" },
    );
  if (error) {
    return { ok: false, message: `Não foi possível anexar: ${error.message}` };
  }

  revalidatePath(`/turmas/${classId}/listas/${assignmentId}`);
  return { ok: true };
}

export async function removerExercicio(formData: FormData): Promise<void> {
  const { user } = await verifySession();
  if (!(await isProfessor())) return;
  const classId = formData.get("class_id") as string;
  const assignmentId = formData.get("assignment_id") as string;
  const exerciseId = formData.get("exercise_id") as string;
  if (!(await ownsAssignment(assignmentId, user.id))) return;

  const admin = createAdminClient();
  await admin
    .from("assignment_exercises")
    .delete()
    .eq("assignment_id", assignmentId)
    .eq("exercise_id", exerciseId);
  revalidatePath(`/turmas/${classId}/listas/${assignmentId}`);
}

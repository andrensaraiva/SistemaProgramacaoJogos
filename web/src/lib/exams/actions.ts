"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

// Modo prova (lockdown). Uma prova é um assignment kind='prova'. O aluno INICIA
// a tentativa; se SAIR DA TELA ou entregar, a prova é FINALIZADA (regra: sair =
// entrega). Depois de finalizada, não dá mais para responder.

export type ExamResult = { ok: true } | { ok: false; message: string };

/** Confirma que o assignment é mesmo uma prova da turma do aluno. */
async function isProvaDoAluno(assignmentId: string, classId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("assignments")
    .select("id, kind, class_id")
    .eq("id", assignmentId)
    .single();
  return Boolean(data && data.kind === "prova" && data.class_id === classId);
}

/** Inicia (ou recupera) a tentativa de prova do aluno. Idempotente. */
export async function iniciarProva(
  assignmentId: string,
  classId: string,
): Promise<ExamResult> {
  const { user } = await verifySession();
  if (!(await isProvaDoAluno(assignmentId, classId)))
    return { ok: false, message: "Prova não encontrada." };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("exam_attempts")
    .select("id, finished_at")
    .eq("assignment_id", assignmentId)
    .eq("student_id", user.id)
    .maybeSingle();

  // Já finalizada: não reabre.
  if (existing?.finished_at) return { ok: false, message: "Esta prova já foi finalizada." };

  if (!existing) {
    const { error } = await admin
      .from("exam_attempts")
      .insert({ assignment_id: assignmentId, student_id: user.id });
    if (error) return { ok: false, message: `Erro ao iniciar: ${error.message}` };
  }

  revalidatePath(`/turmas/${classId}/listas/${assignmentId}`);
  return { ok: true };
}

/**
 * Finaliza a prova. `leftScreen` marca que a finalização veio por saída da tela
 * (sinal para o professor). Idempotente: finalizar de novo não muda o resultado.
 */
export async function finalizarProva(
  assignmentId: string,
  classId: string,
  leftScreen: boolean,
): Promise<ExamResult> {
  const { user } = await verifySession();
  if (!(await isProvaDoAluno(assignmentId, classId)))
    return { ok: false, message: "Prova não encontrada." };

  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("exam_attempts")
    .select("id, finished_at")
    .eq("assignment_id", assignmentId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!attempt) {
    // Sem tentativa aberta: cria já finalizada (caso raro de borda).
    await admin.from("exam_attempts").insert({
      assignment_id: assignmentId,
      student_id: user.id,
      finished_at: new Date().toISOString(),
      left_screen: leftScreen,
    });
  } else if (!attempt.finished_at) {
    await admin
      .from("exam_attempts")
      .update({ finished_at: new Date().toISOString(), left_screen: leftScreen })
      .eq("id", attempt.id);
  }

  revalidatePath(`/turmas/${classId}/listas/${assignmentId}`);
  return { ok: true };
}

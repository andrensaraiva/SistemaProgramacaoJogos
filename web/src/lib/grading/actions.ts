"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { isCodeKind } from "@/lib/activities/registry";
import { getProfile } from "@/lib/auth/dal";
import { awardDeliveryXp } from "@/lib/gamification/award";
import { gradeXp, participationXp, type Difficulty } from "@/lib/gamification/reward-xp";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAcessoTurma } from "@/lib/turmas/access";

export type GradeState =
  | { ok: true; message: string }
  | { ok: false; message: string }
  | undefined;

const GradeSchema = z.object({
  submission_id: z.string().uuid(),
  // Nota 0–10 com uma casa; vazio = limpar nota.
  grade: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v))
    .refine(
      (v) => v === null || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 10),
      { error: "A nota deve ser um número entre 0 e 10." },
    ),
  feedback: z.string().trim().max(4000).optional().default(""),
});

// Professor dono da turma corrige uma submissão (nota manual + feedback).
// Verifica posse pelo caminho submission → assignment → class.owner_id.
export async function gradeSubmission(
  classId: string,
  assignmentId: string,
  _prev: GradeState,
  formData: FormData,
): Promise<GradeState> {
  const profile = await getProfile();
  if (!profile) return { ok: false, message: "Sessão inválida." };

  const parsed = GradeSchema.safeParse({
    submission_id: formData.get("submission_id"),
    grade: formData.get("grade") ?? "",
    feedback: formData.get("feedback") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message:
        z.flattenError(parsed.error).fieldErrors.grade?.[0] ??
        "Dados inválidos.",
    };
  }

  const admin = createAdminClient();

  // 1. A submissão pertence a uma turma deste professor?
  const { data: sub, error: subErr } = await admin
    .from("submissions")
    .select(
      "id, assignment_id, student_id, exercise:exercises!exercise_id(exercise_type, difficulty), assignment:assignments!assignment_id(class_id, class:classes!class_id(owner_id))",
    )
    .eq("id", parsed.data.submission_id)
    .single();

  if (subErr || !sub) {
    return { ok: false, message: "Submissão não encontrada." };
  }

  const assignment = sub.assignment as unknown as {
    class_id: string;
    class: { owner_id: string };
  };

  // Gerencia a turma? (dono, co-docente, coordenador ou admin)
  const { podeGerenciar } = await getAcessoTurma(
    assignment.class_id,
    profile,
    assignment.class.owner_id,
  );
  if (
    !podeGerenciar ||
    assignment?.class_id !== classId ||
    sub.assignment_id !== assignmentId
  ) {
    return { ok: false, message: "Você não pode corrigir esta submissão." };
  }

  // 2. Atualiza nota + feedback.
  const { error: updErr } = await admin
    .from("submissions")
    .update({
      manual_grade: parsed.data.grade === null ? null : Number(parsed.data.grade),
      manual_feedback: parsed.data.feedback || null,
      graded_by: profile.id,
      graded_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.submission_id);

  if (updErr) {
    return { ok: false, message: `Não foi possível salvar: ${updErr.message}` };
  }

  // XP por NOTA (mérito), só para entregas não-código (código já ganha XP pelos
  // testes via trigger). Total desta submissão = participação + mérito pela nota.
  // O award paga só o delta, então re-corrigir ajusta o XP sem duplicar.
  const exercise = sub.exercise as unknown as { exercise_type: string; difficulty: string } | null;
  if (exercise && !isCodeKind(exercise.exercise_type)) {
    const nota = parsed.data.grade === null ? null : Number(parsed.data.grade);
    const desired =
      participationXp(exercise.difficulty as Difficulty) +
      gradeXp(nota, exercise.difficulty as Difficulty);
    await awardDeliveryXp(parsed.data.submission_id, sub.student_id, desired);
  }

  revalidatePath(`/turmas/${classId}/listas/${assignmentId}`);
  return { ok: true, message: "Correção salva." };
}

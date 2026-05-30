"use server";

import { revalidatePath } from "next/cache";

import { isProfessor, verifySession } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

// -----------------------------------------------------------------------------
// Frequência: grade aluno × aula (espelha a lista de presença em PDF).
// O professor cria sessões numeradas e marca presente/falta/atraso por aluno.
// Verifica posse da turma via class_unit → class.owner_id.
// -----------------------------------------------------------------------------

type ActionResult = { ok: true } | { ok: false; message: string };

export type AttendanceStatus = "presente" | "falta" | "atraso";

async function ownsClassUnit(classUnitId: string, userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("class_units")
    .select("id, class:classes!class_id(owner_id)")
    .eq("id", classUnitId)
    .single();
  const cls = data?.class as unknown as { owner_id: string } | undefined;
  return cls?.owner_id === userId;
}

/**
 * Cria as aulas de UM dia. Um dia pode ter várias aulas/tempos (campo `period`
 * 1..N). Cada uma vira uma attendance_session com a mesma data e session_number
 * sequencial. Aceita `date`, `quantidade` (nº de aulas no dia) e `label`.
 */
export async function criarAulasDoDia(
  classUnitId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await verifySession();
  if (!(await isProfessor())) {
    return { ok: false, message: "Apenas professores." };
  }
  if (!(await ownsClassUnit(classUnitId, user.id))) {
    return { ok: false, message: "Você não é dono desta turma." };
  }

  const dateStr = (formData.get("date") as string) || null;
  const label = (formData.get("label") as string) || null;
  const qtdRaw = Number(formData.get("quantidade"));
  const quantidade =
    Number.isFinite(qtdRaw) && qtdRaw >= 1 ? Math.min(Math.trunc(qtdRaw), 12) : 1;

  const admin = createAdminClient();
  const { data: last } = await admin
    .from("attendance_sessions")
    .select("session_number")
    .eq("class_unit_id", classUnitId)
    .order("session_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const base = last?.session_number ?? 0;
  const rows = Array.from({ length: quantidade }, (_, i) => ({
    class_unit_id: classUnitId,
    session_number: base + i + 1,
    period: i + 1,
    date: dateStr,
    label,
  }));

  const { error } = await admin.from("attendance_sessions").insert(rows);
  if (error) {
    return { ok: false, message: `Não foi possível criar as aulas: ${error.message}` };
  }

  revalidatePath(`/turmas`);
  return { ok: true };
}

/** Marca/atualiza a presença de um aluno numa sessão (upsert). */
export async function marcarPresenca(
  sessionId: string,
  studentId: string,
  status: AttendanceStatus,
): Promise<ActionResult> {
  const { user } = await verifySession();
  if (!(await isProfessor())) {
    return { ok: false, message: "Apenas professores." };
  }

  const admin = createAdminClient();
  // Confirma que a sessão pertence a uma turma do professor.
  const { data: session } = await admin
    .from("attendance_sessions")
    .select("id, unit:class_units!class_unit_id(class:classes!class_id(owner_id))")
    .eq("id", sessionId)
    .single();
  const owner = (
    session?.unit as unknown as { class: { owner_id: string } } | undefined
  )?.class?.owner_id;
  if (owner !== user.id) {
    return { ok: false, message: "Você não pode alterar esta frequência." };
  }

  const { error } = await admin.from("attendance_marks").upsert(
    { session_id: sessionId, student_id: studentId, status },
    { onConflict: "session_id,student_id" },
  );
  if (error) {
    return { ok: false, message: `Não foi possível salvar: ${error.message}` };
  }
  return { ok: true };
}

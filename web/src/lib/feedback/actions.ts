"use server";

import { createHmac } from "node:crypto";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { getProfile, verifySession } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

import { summarize, type FeedbackItem, type FeedbackSummary } from "./aggregate";

// Feedback ANÔNIMO do aluno sobre o professor. O autor NUNCA é gravado. Para
// impedir voto duplicado sem revelar quem votou, gravamos um hash (HMAC com um
// segredo de servidor) de (aluno + alvo). Sem o segredo, o hash não liga ao
// aluno; nem admin descobre o autor.

export type FeedbackState = { ok?: false; message?: string } | { ok: true; message: string } | undefined;

const Schema = z.object({
  class_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  class_unit_id: z.string().uuid().optional().or(z.literal("")),
  session_id: z.string().uuid().optional().or(z.literal("")),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().default(""),
});

function dedupeHash(studentId: string, teacherId: string, alvo: string): string {
  const secret = process.env.FEEDBACK_SECRET;
  if (!secret) throw new Error("FEEDBACK_SECRET ausente no servidor.");
  return createHmac("sha256", secret).update(`${studentId}:${teacherId}:${alvo}`).digest("hex");
}

export async function enviarFeedback(
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const { user } = await verifySession();

  const parsed = Schema.safeParse({
    class_id: formData.get("class_id"),
    teacher_id: formData.get("teacher_id"),
    class_unit_id: formData.get("class_unit_id") || "",
    session_id: formData.get("session_id") || "",
    rating: formData.get("rating"),
    comment: formData.get("comment") ?? "",
  });
  if (!parsed.success) return { ok: false, message: "Preencha a avaliação corretamente." };
  const d = parsed.data;

  const admin = createAdminClient();

  // O autor precisa ser ALUNO matriculado na turma.
  const { data: membership } = await admin
    .from("class_members")
    .select("student_id")
    .eq("class_id", d.class_id)
    .eq("student_id", user.id)
    .maybeSingle();
  if (!membership) return { ok: false, message: "Você não está nesta turma." };

  // O alvo precisa ser professor da turma (dono ou co-professor).
  const { data: turma } = await admin.from("classes").select("owner_id").eq("id", d.class_id).single();
  const isOwner = turma?.owner_id === d.teacher_id;
  const { data: co } = await admin
    .from("class_teachers")
    .select("teacher_id")
    .eq("class_id", d.class_id)
    .eq("teacher_id", d.teacher_id)
    .maybeSingle();
  if (!isOwner && !co) return { ok: false, message: "Este professor não leciona nesta turma." };

  // Alvo do feedback (para o hash e dedupe): aula específica ou UC geral ou turma.
  const alvo = d.session_id || d.class_unit_id || "geral";
  let hash: string;
  try {
    hash = dedupeHash(user.id, d.teacher_id, alvo);
  } catch {
    return { ok: false, message: "Avaliação indisponível no momento (config do servidor)." };
  }

  const { error } = await admin.from("teacher_feedback").insert({
    class_id: d.class_id,
    teacher_id: d.teacher_id,
    class_unit_id: d.class_unit_id || null,
    session_id: d.session_id || null,
    rating: d.rating,
    comment: d.comment || null,
    dedupe_hash: hash,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Você já avaliou este professor neste contexto." };
    }
    return { ok: false, message: "Não foi possível registrar a avaliação." };
  }

  revalidatePath(`/turmas/${d.class_id}`);
  return { ok: true, message: "Avaliação enviada anonimamente. Obrigado!" };
}

/** Resumo do feedback de um professor (para ele mesmo ou admin). Sem autor. */
export async function getFeedbackResumo(teacherId: string): Promise<FeedbackSummary> {
  const profile = await getProfile();
  // Só o próprio professor ou o admin.
  if (!profile || (profile.id !== teacherId && profile.role !== "admin")) {
    return summarize([]);
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("teacher_feedback")
    .select("rating, comment, class_unit_id, session_id, created_at")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  const items: FeedbackItem[] = (data ?? []).map((f) => ({
    rating: f.rating,
    comment: f.comment,
    classUnitId: f.class_unit_id,
    sessionId: f.session_id,
    createdAt: f.created_at,
  }));
  return summarize(items);
}

/** Média de feedback por professor (para relatórios do admin). */
export async function getMediasFeedback(teacherIds: string[]): Promise<Map<string, { avg: number | null; total: number }>> {
  const admin = createAdminClient();
  const out = new Map<string, { avg: number | null; total: number }>();
  if (teacherIds.length === 0) return out;

  const { data } = await admin
    .from("teacher_feedback")
    .select("teacher_id, rating")
    .in("teacher_id", teacherIds);

  const acc = new Map<string, number[]>();
  for (const f of data ?? []) {
    const arr = acc.get(f.teacher_id) ?? [];
    arr.push(f.rating);
    acc.set(f.teacher_id, arr);
  }
  for (const id of teacherIds) {
    const arr = acc.get(id) ?? [];
    out.set(id, {
      avg: arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null,
      total: arr.length,
    });
  }
  return out;
}

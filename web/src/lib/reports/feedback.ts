import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { summarize, type FeedbackItem, type FeedbackSummary } from "@/lib/feedback/aggregate";

// Relatórios de feedback para o ADMIN: por PROFESSOR (agregando todas as turmas
// em que ele leciona) e por TURMA (todos os professores dela). Tudo anônimo.

export type ProfessorFeedback = {
  id: string;
  nome: string;
  resumo: FeedbackSummary;
  porTurma: { turma: string; media: number | null; total: number }[];
};

export type ClassFeedback = {
  classId: string;
  turma: string;
  professores: { id: string; nome: string; media: number | null; total: number }[];
  total: number;
};

async function nomes(ids: string[]): Promise<Map<string, string>> {
  const admin = createAdminClient();
  if (ids.length === 0) return new Map();
  const { data } = await admin.from("profiles").select("id, display_name").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id, p.display_name]));
}

/** Lista de professores com nº de avaliações (para o índice do relatório). */
export async function getFeedbackIndex(): Promise<
  { id: string; nome: string; media: number | null; total: number }[]
> {
  const admin = createAdminClient();
  const { data: profs } = await admin
    .from("profiles")
    .select("id, display_name")
    .eq("role", "professor")
    .order("display_name");

  const { data: fb } = await admin.from("teacher_feedback").select("teacher_id, rating");
  const acc = new Map<string, number[]>();
  for (const f of fb ?? []) {
    const arr = acc.get(f.teacher_id) ?? [];
    arr.push(f.rating);
    acc.set(f.teacher_id, arr);
  }
  return (profs ?? []).map((p) => {
    const arr = acc.get(p.id) ?? [];
    return {
      id: p.id,
      nome: p.display_name,
      media: arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null,
      total: arr.length,
    };
  });
}

/** Feedback de UM professor agregando TODAS as turmas dele. */
export async function getProfessorFeedback(teacherId: string): Promise<ProfessorFeedback | null> {
  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("id, display_name")
    .eq("id", teacherId)
    .single();
  if (!prof) return null;

  const { data: fb } = await admin
    .from("teacher_feedback")
    .select("rating, comment, class_unit_id, session_id, created_at, class_id")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  const items: FeedbackItem[] = (fb ?? []).map((f) => ({
    rating: f.rating,
    comment: f.comment,
    classUnitId: f.class_unit_id,
    sessionId: f.session_id,
    createdAt: f.created_at,
  }));

  // Média por turma.
  const porTurmaAcc = new Map<string, number[]>();
  for (const f of fb ?? []) {
    const arr = porTurmaAcc.get(f.class_id) ?? [];
    arr.push(f.rating);
    porTurmaAcc.set(f.class_id, arr);
  }
  const turmaIds = [...porTurmaAcc.keys()];
  const { data: turmas } = turmaIds.length
    ? await admin.from("classes").select("id, name").in("id", turmaIds)
    : { data: [] as { id: string; name: string }[] };
  const turmaNome = new Map((turmas ?? []).map((t) => [t.id, t.name]));

  const porTurma = turmaIds.map((cid) => {
    const arr = porTurmaAcc.get(cid) ?? [];
    return {
      turma: turmaNome.get(cid) ?? "Turma",
      media: arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null,
      total: arr.length,
    };
  });

  return { id: prof.id, nome: prof.display_name, resumo: summarize(items), porTurma };
}

/** Feedback de UMA turma (todos os professores dela). */
export async function getClassFeedback(classId: string): Promise<ClassFeedback | null> {
  const admin = createAdminClient();
  const { data: turma } = await admin.from("classes").select("id, name").eq("id", classId).single();
  if (!turma) return null;

  const { data: fb } = await admin
    .from("teacher_feedback")
    .select("teacher_id, rating")
    .eq("class_id", classId);

  const acc = new Map<string, number[]>();
  for (const f of fb ?? []) {
    const arr = acc.get(f.teacher_id) ?? [];
    arr.push(f.rating);
    acc.set(f.teacher_id, arr);
  }
  const nomeMap = await nomes([...acc.keys()]);

  const professores = [...acc.entries()].map(([tid, arr]) => ({
    id: tid,
    nome: nomeMap.get(tid) ?? "Professor",
    media: arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null,
    total: arr.length,
  }));

  return { classId, turma: turma.name, professores, total: (fb ?? []).length };
}

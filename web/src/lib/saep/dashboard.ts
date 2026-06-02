import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Agrega o desempenho no SAEP (teórico) de uma UC: % de acerto por COMPETÊNCIA
// e por OBJETO DE CONHECIMENTO (da matriz do curso), além de visão por aluno.
// É o que orienta o reforço ("a turma vai mal em Testes", "Anna domina POO").
// O caller deve ter verificado a posse da turma (dono da UC).

export type TagStat = {
  code: string;
  label: string;
  total: number; // respostas contabilizadas
  correct: number;
  pct: number | null; // % de acerto (null se sem respostas)
};

export type StudentSaepStat = {
  id: string;
  name: string;
  answered: number;
  correct: number;
  pct: number | null;
  attempts: number; // simulados enviados
};

export type SaepDashboard = {
  classUnit: { id: string };
  turma: { id: string; name: string };
  uc: { title: string } | null;
  totalSimulados: number;
  totalSubmittedAttempts: number;
  overall: { total: number; correct: number; pct: number | null };
  byCompetency: TagStat[];
  byKnowledgeObject: TagStat[];
  students: StudentSaepStat[];
};

export async function getSaepDashboard(classUnitId: string): Promise<SaepDashboard | null> {
  const admin = createAdminClient();

  const { data: cu } = await admin
    .from("class_units")
    .select("id, class:classes!class_id(id, name), uc:curricular_units!uc_id(title)")
    .eq("id", classUnitId)
    .single();
  if (!cu) return null;
  const turma = cu.class as unknown as { id: string; name: string };
  const uc = cu.uc as unknown as { title: string } | null;

  // Simulados desta UC.
  const { data: simulados } = await admin
    .from("quiz_simulados")
    .select("id")
    .eq("class_unit_id", classUnitId);
  const simuladoIds = (simulados ?? []).map((s) => s.id);

  // Estado vazio: ainda não há simulados.
  if (!simuladoIds.length) {
    return {
      classUnit: { id: classUnitId },
      turma,
      uc,
      totalSimulados: 0,
      totalSubmittedAttempts: 0,
      overall: { total: 0, correct: 0, pct: null },
      byCompetency: [],
      byKnowledgeObject: [],
      students: [],
    };
  }

  // Tentativas ENVIADAS (só contamos respostas de quem entregou).
  const { data: attempts } = await admin
    .from("quiz_attempts")
    .select("id, student_id")
    .in("simulado_id", simuladoIds)
    .not("submitted_at", "is", null);
  const attemptIds = (attempts ?? []).map((a) => a.id);
  const studentByAttempt = new Map((attempts ?? []).map((a) => [a.id, a.student_id]));

  // Respostas dessas tentativas.
  const { data: answers } = attemptIds.length
    ? await admin
        .from("quiz_answers")
        .select("attempt_id, question_id, is_correct")
        .in("attempt_id", attemptIds)
    : { data: [] as { attempt_id: string; question_id: string; is_correct: boolean | null }[] };

  // Questões envolvidas → competência/objeto.
  const questionIds = [...new Set((answers ?? []).map((a) => a.question_id))];
  const { data: questions } = questionIds.length
    ? await admin
        .from("quiz_questions")
        .select(
          "id, competency:competencies!competency_id(id, code, description), knowledge_object:knowledge_objects!knowledge_object_id(id, code, name)",
        )
        .in("id", questionIds)
    : { data: [] };

  type QTag = {
    comp: { code: string; description: string } | null;
    obj: { code: string; name: string } | null;
  };
  const qTag = new Map<string, QTag>();
  for (const q of questions ?? []) {
    qTag.set(q.id, {
      comp: (q.competency as unknown as { code: string; description: string } | null) ?? null,
      obj: (q.knowledge_object as unknown as { code: string; name: string } | null) ?? null,
    });
  }

  // Acumuladores.
  const compAcc = new Map<string, TagStat>();
  const objAcc = new Map<string, TagStat>();
  const studentAcc = new Map<string, StudentSaepStat>();
  let overallTotal = 0;
  let overallCorrect = 0;

  // Inicializa alunos a partir das tentativas (nomes vêm depois).
  const studentIds = [...new Set((attempts ?? []).map((a) => a.student_id))];
  for (const sid of studentIds) {
    studentAcc.set(sid, { id: sid, name: sid, answered: 0, correct: 0, pct: null, attempts: 0 });
  }
  for (const a of attempts ?? []) {
    const st = studentAcc.get(a.student_id);
    if (st) st.attempts += 1;
  }

  function bump(map: Map<string, TagStat>, code: string, label: string, correct: boolean) {
    const cur = map.get(code) ?? { code, label, total: 0, correct: 0, pct: null };
    cur.total += 1;
    if (correct) cur.correct += 1;
    map.set(code, cur);
  }

  for (const ans of answers ?? []) {
    const correct = ans.is_correct === true;
    overallTotal += 1;
    if (correct) overallCorrect += 1;

    const sid = studentByAttempt.get(ans.attempt_id);
    if (sid) {
      const st = studentAcc.get(sid)!;
      st.answered += 1;
      if (correct) st.correct += 1;
    }

    const tag = qTag.get(ans.question_id);
    if (tag?.comp) bump(compAcc, tag.comp.code, `${tag.comp.code} — ${tag.comp.description}`, correct);
    if (tag?.obj) bump(objAcc, tag.obj.code, `${tag.obj.code} — ${tag.obj.name}`, correct);
  }

  // Nomes dos alunos.
  if (studentIds.length) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name")
      .in("id", studentIds);
    for (const p of profiles ?? []) {
      const st = studentAcc.get(p.id);
      if (st) st.name = p.display_name;
    }
  }

  const finishPct = (s: TagStat) => ({
    ...s,
    pct: s.total > 0 ? Math.round((s.correct / s.total) * 100) : null,
  });

  const byCompetency = [...compAcc.values()].map(finishPct).sort((a, b) => a.code.localeCompare(b.code));
  const byKnowledgeObject = [...objAcc.values()].map(finishPct).sort((a, b) => a.code.localeCompare(b.code));

  const students = [...studentAcc.values()]
    .map((s) => ({ ...s, pct: s.answered > 0 ? Math.round((s.correct / s.answered) * 100) : null }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    classUnit: { id: classUnitId },
    turma,
    uc,
    totalSimulados: simuladoIds.length,
    totalSubmittedAttempts: attemptIds.length,
    overall: {
      total: overallTotal,
      correct: overallCorrect,
      pct: overallTotal > 0 ? Math.round((overallCorrect / overallTotal) * 100) : null,
    },
    byCompetency,
    byKnowledgeObject,
    students,
  };
}

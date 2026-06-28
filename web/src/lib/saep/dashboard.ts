import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Agrega o desempenho de uma UC por COMPETÊNCIA e por OBJETO DE CONHECIMENTO
// (da matriz do curso) combinando as duas avaliações:
//   - SAEP teórico (quiz_answers dos simulados enviados)
//   - SAP prático (sap_item_marks das avaliações fechadas)
// É o que orienta o reforço ("a turma vai mal em Testes", "Anna domina POO").
// O caller deve ter verificado a posse da turma (dono da UC).

export type TagStat = {
  code: string;
  label: string;
  total: number; // sinais contabilizados (respostas de quiz + itens de SAP)
  correct: number; // acertos (quiz) + itens "Sim" (SAP)
  pct: number | null;
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
  totalSapAssessments: number;
  totalSapEvaluations: number;
  overall: {
    total: number;
    correct: number;
    pct: number | null;
    // Split por fonte (aditivo): teórico = quiz, prático = SAP.
    teoricoTotal: number;
    teoricoCorrect: number;
    sapTotal: number;
    sapCorrect: number;
  };
  byCompetency: TagStat[];
  byKnowledgeObject: TagStat[];
  students: StudentSaepStat[];
};

type TagRef = {
  comp: { code: string; description: string } | null;
  obj: { code: string; name: string } | null;
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

  // Acumuladores compartilhados entre teórico e prático.
  const compAcc = new Map<string, TagStat>();
  const objAcc = new Map<string, TagStat>();
  const studentAcc = new Map<string, StudentSaepStat>();
  let overallTotal = 0;
  let overallCorrect = 0;
  let teoricoTotal = 0;
  let teoricoCorrect = 0;
  let sapTotal = 0;
  let sapCorrect = 0;

  function bump(map: Map<string, TagStat>, code: string, label: string, ok: boolean) {
    const cur = map.get(code) ?? { code, label, total: 0, correct: 0, pct: null };
    cur.total += 1;
    if (ok) cur.correct += 1;
    map.set(code, cur);
  }
  function tagSignal(ref: TagRef | undefined, ok: boolean) {
    if (ref?.comp) bump(compAcc, ref.comp.code, `${ref.comp.code} — ${ref.comp.description}`, ok);
    if (ref?.obj) bump(objAcc, ref.obj.code, `${ref.obj.code} — ${ref.obj.name}`, ok);
  }

  // ---------------------------------------------------------------------------
  // SAEP TEÓRICO — simulados -> tentativas enviadas -> respostas -> questões.
  // ---------------------------------------------------------------------------
  const { data: simulados } = await admin
    .from("quiz_simulados")
    .select("id")
    .eq("class_unit_id", classUnitId);
  const simuladoIds = (simulados ?? []).map((s) => s.id);

  let submittedAttempts = 0;
  if (simuladoIds.length) {
    const { data: attempts } = await admin
      .from("quiz_attempts")
      .select("id, student_id")
      .in("simulado_id", simuladoIds)
      .not("submitted_at", "is", null);
    submittedAttempts = (attempts ?? []).length;
    const studentByAttempt = new Map((attempts ?? []).map((a) => [a.id, a.student_id]));
    const attemptIds = (attempts ?? []).map((a) => a.id);

    // Aluno = quem tem tentativa enviada (para a tabela por aluno, foco teórico).
    for (const a of attempts ?? []) {
      const st =
        studentAcc.get(a.student_id) ??
        ({ id: a.student_id, name: a.student_id, answered: 0, correct: 0, pct: null, attempts: 0 } as StudentSaepStat);
      st.attempts += 1;
      studentAcc.set(a.student_id, st);
    }

    const { data: answers } = attemptIds.length
      ? await admin
          .from("quiz_answers")
          .select("attempt_id, question_id, is_correct")
          .in("attempt_id", attemptIds)
      : { data: [] as { attempt_id: string; question_id: string; is_correct: boolean | null }[] };

    const questionIds = [...new Set((answers ?? []).map((a) => a.question_id))];
    const { data: questions } = questionIds.length
      ? await admin
          .from("quiz_questions")
          .select(
            "id, competency:competencies!competency_id(code, description), knowledge_object:knowledge_objects!knowledge_object_id(code, name)",
          )
          .in("id", questionIds)
      : { data: [] };
    const qTag = new Map<string, TagRef>();
    for (const q of questions ?? []) {
      qTag.set(q.id, {
        comp: (q.competency as unknown as { code: string; description: string } | null) ?? null,
        obj: (q.knowledge_object as unknown as { code: string; name: string } | null) ?? null,
      });
    }

    for (const ans of answers ?? []) {
      const ok = ans.is_correct === true;
      overallTotal += 1;
      teoricoTotal += 1;
      if (ok) {
        overallCorrect += 1;
        teoricoCorrect += 1;
      }
      const sid = studentByAttempt.get(ans.attempt_id);
      if (sid) {
        const st = studentAcc.get(sid)!;
        st.answered += 1;
        if (ok) st.correct += 1;
      }
      tagSignal(qTag.get(ans.question_id), ok);
    }
  }

  // ---------------------------------------------------------------------------
  // SAP PRÁTICO — assessments -> avaliações -> marcações de item (Sim/Não).
  // Cada item avaliado é um sinal por competência/objeto (item "Sim" = acerto).
  // ---------------------------------------------------------------------------
  const { data: sapAssessments } = await admin
    .from("sap_assessments")
    .select("id")
    .eq("class_unit_id", classUnitId);
  const assessmentIds = (sapAssessments ?? []).map((a) => a.id);

  let sapEvaluationsCount = 0;
  if (assessmentIds.length) {
    const { data: evals } = await admin
      .from("sap_evaluations")
      .select("id")
      .in("assessment_id", assessmentIds)
      .not("evaluated_at", "is", null);
    const evalIds = (evals ?? []).map((e) => e.id);
    sapEvaluationsCount = evalIds.length;

    if (evalIds.length) {
      const { data: marks } = await admin
        .from("sap_item_marks")
        .select("item_id, met")
        .in("evaluation_id", evalIds);
      const itemIds = [...new Set((marks ?? []).map((m) => m.item_id))];

      const { data: items } = itemIds.length
        ? await admin
            .from("sap_items")
            .select(
              "id, competency:competencies!competency_id(code, description), knowledge_object:knowledge_objects!knowledge_object_id(code, name)",
            )
            .in("id", itemIds)
        : { data: [] };
      const itemTag = new Map<string, TagRef>();
      for (const it of items ?? []) {
        itemTag.set(it.id, {
          comp: (it.competency as unknown as { code: string; description: string } | null) ?? null,
          obj: (it.knowledge_object as unknown as { code: string; name: string } | null) ?? null,
        });
      }

      for (const m of marks ?? []) {
        const ok = m.met === true;
        overallTotal += 1;
        sapTotal += 1;
        if (ok) {
          overallCorrect += 1;
          sapCorrect += 1;
        }
        tagSignal(itemTag.get(m.item_id), ok);
      }
    }
  }

  // Sem nenhum dado (nem teórico nem prático).
  if (!simuladoIds.length && !assessmentIds.length) {
    return {
      classUnit: { id: classUnitId },
      turma,
      uc,
      totalSimulados: 0,
      totalSubmittedAttempts: 0,
      totalSapAssessments: 0,
      totalSapEvaluations: 0,
      overall: {
        total: 0,
        correct: 0,
        pct: null,
        teoricoTotal: 0,
        teoricoCorrect: 0,
        sapTotal: 0,
        sapCorrect: 0,
      },
      byCompetency: [],
      byKnowledgeObject: [],
      students: [],
    };
  }

  // Nomes dos alunos (os que aparecem na tabela teórica).
  const studentIds = [...studentAcc.keys()];
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
    totalSubmittedAttempts: submittedAttempts,
    totalSapAssessments: assessmentIds.length,
    totalSapEvaluations: sapEvaluationsCount,
    overall: {
      total: overallTotal,
      correct: overallCorrect,
      pct: overallTotal > 0 ? Math.round((overallCorrect / overallTotal) * 100) : null,
      teoricoTotal,
      teoricoCorrect,
      sapTotal,
      sapCorrect,
    },
    byCompetency,
    byKnowledgeObject,
    students,
  };
}

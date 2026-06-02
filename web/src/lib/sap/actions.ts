"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { isProfessor, verifySession } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeSapScore } from "@/lib/sap/scoring";

// -----------------------------------------------------------------------------
// SAP prático — lista de verificação (rubrica) por desafio. A rubrica vive na
// atividade (kind='sap_pratico'). Professor monta a árvore (unidade→elemento→
// critério→item Sim/Não), o aluno entrega um link, o professor preenche a lista
// por aluno e a nota sai da soma dos pontos dos itens "Sim" (lib/sap/scoring).
// Posse verificada no código (admin client).
// -----------------------------------------------------------------------------

export type ActionResult = { ok: true; id?: string } | { ok: false; message: string };

async function ownsClassUnit(classUnitId: string, userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("class_units")
    .select("class:classes!class_id(owner_id)")
    .eq("id", classUnitId)
    .single();
  return (data?.class as unknown as { owner_id: string } | undefined)?.owner_id === userId;
}

// Resolve o assessment (sap_assessments) da atividade, criando na 1ª visita do
// professor. Espelha obterOuCriarSimulado do SAEP.
export async function obterOuCriarSap(assignmentId: string): Promise<ActionResult> {
  const { user } = await verifySession();
  if (!(await isProfessor())) return { ok: false, message: "Apenas professores." };

  const admin = createAdminClient();
  const { data: assignment } = await admin
    .from("assignments")
    .select("id, title, kind, class_unit_id")
    .eq("id", assignmentId)
    .single();
  if (!assignment || assignment.kind !== "sap_pratico" || !assignment.class_unit_id)
    return { ok: false, message: "Atividade de SAP inválida." };
  if (!(await ownsClassUnit(assignment.class_unit_id, user.id)))
    return { ok: false, message: "Você não é dono desta turma." };

  const { data: existing } = await admin
    .from("sap_assessments")
    .select("id")
    .eq("assignment_id", assignmentId)
    .maybeSingle();
  if (existing) return { ok: true, id: existing.id };

  const { data: created, error } = await admin
    .from("sap_assessments")
    .insert({
      assignment_id: assignmentId,
      class_unit_id: assignment.class_unit_id,
      title: assignment.title,
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false, message: "Erro ao criar o SAP." };
  return { ok: true, id: created.id };
}

// Configuração do SAP (título, enunciado, nota cheia).
const ConfigSchema = z.object({
  title: z.string().trim().min(3, "Título muito curto."),
  description: z.string().trim().max(20000).optional().default(""),
  max_score: z.coerce.number().min(0).max(1000).optional(),
});

export async function atualizarSap(assessmentId: string, input: unknown): Promise<ActionResult> {
  const { user } = await verifySession();
  const parsed = ConfigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Dados inválidos." };

  const admin = createAdminClient();
  const { data: a } = await admin
    .from("sap_assessments")
    .select("class_unit_id, class_unit:class_units!class_unit_id(class_id)")
    .eq("id", assessmentId)
    .single();
  if (!a || !(await ownsClassUnit(a.class_unit_id, user.id)))
    return { ok: false, message: "Sem permissão." };

  const { error } = await admin
    .from("sap_assessments")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      max_score: parsed.data.max_score ?? null,
    })
    .eq("id", assessmentId);
  if (error) return { ok: false, message: `Erro: ${error.message}` };

  const classId = (a.class_unit as unknown as { class_id: string } | undefined)?.class_id;
  if (classId) revalidatePath(`/turmas/${classId}/ucs/${a.class_unit_id}/sap/${assessmentId}`);
  return { ok: true, id: assessmentId };
}

// Salva a RUBRICA inteira de uma vez (árvore vinda do editor). Recria o conteúdo.
type ItemDraft = {
  code?: string;
  description: string;
  points?: number;
  competency_id?: string;
  knowledge_object_id?: string;
};
type CriterionDraft = { code?: string; description: string; items: ItemDraft[] };
type ElementDraft = { code?: string; title: string; criteria: CriterionDraft[] };
type UnitDraft = { code?: string; title: string; elements: ElementDraft[] };

export async function salvarRubrica(
  assessmentId: string,
  units: UnitDraft[],
): Promise<ActionResult> {
  const { user } = await verifySession();
  const admin = createAdminClient();
  const { data: a } = await admin
    .from("sap_assessments")
    .select("class_unit_id, class_unit:class_units!class_unit_id(class_id)")
    .eq("id", assessmentId)
    .single();
  if (!a || !(await ownsClassUnit(a.class_unit_id, user.id)))
    return { ok: false, message: "Sem permissão." };

  // Recria: apaga unidades (cascateia elements/criteria/items) e reinsere.
  await admin.from("sap_units").delete().eq("assessment_id", assessmentId);

  for (let ui = 0; ui < units.length; ui++) {
    const u = units[ui];
    if (!u.title?.trim()) continue;
    const { data: unitRow, error: uErr } = await admin
      .from("sap_units")
      .insert({ assessment_id: assessmentId, code: u.code || null, title: u.title, ord: ui })
      .select("id")
      .single();
    if (uErr || !unitRow) return { ok: false, message: "Erro ao salvar unidade." };

    for (let ei = 0; ei < (u.elements ?? []).length; ei++) {
      const e = u.elements[ei];
      if (!e.title?.trim()) continue;
      const { data: elRow, error: eErr } = await admin
        .from("sap_elements")
        .insert({ unit_id: unitRow.id, code: e.code || null, title: e.title, ord: ei })
        .select("id")
        .single();
      if (eErr || !elRow) return { ok: false, message: "Erro ao salvar elemento." };

      for (let ci = 0; ci < (e.criteria ?? []).length; ci++) {
        const c = e.criteria[ci];
        if (!c.description?.trim()) continue;
        const { data: crRow, error: cErr } = await admin
          .from("sap_criteria")
          .insert({ element_id: elRow.id, code: c.code || null, description: c.description, ord: ci })
          .select("id")
          .single();
        if (cErr || !crRow) return { ok: false, message: "Erro ao salvar critério." };

        const itemsPayload = (c.items ?? [])
          .filter((it) => it.description?.trim())
          .map((it, ii) => ({
            criterion_id: crRow.id,
            code: it.code || null,
            description: it.description,
            points: it.points ?? 1,
            competency_id: it.competency_id || null,
            knowledge_object_id: it.knowledge_object_id || null,
            ord: ii,
          }));
        if (itemsPayload.length) {
          const { error: iErr } = await admin.from("sap_items").insert(itemsPayload);
          if (iErr) return { ok: false, message: "Erro ao salvar itens." };
        }
      }
    }
  }

  const classId = (a.class_unit as unknown as { class_id: string } | undefined)?.class_id;
  if (classId) revalidatePath(`/turmas/${classId}/ucs/${a.class_unit_id}/sap/${assessmentId}`);
  return { ok: true, id: assessmentId };
}

// -----------------------------------------------------------------------------
// ALUNO: entrega (link). Cria/atualiza a sap_evaluation do aluno (sem nota ainda).
// -----------------------------------------------------------------------------
const EntregaSchema = z.object({ link: z.string().trim().url("Informe um link válido (http...).") });

export async function entregarSap(assessmentId: string, input: unknown): Promise<ActionResult> {
  const { user } = await verifySession();
  const parsed = EntregaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Informe um link válido." };

  const admin = createAdminClient();
  const { data: a } = await admin
    .from("sap_assessments")
    .select("class_unit_id, class_unit:class_units!class_unit_id(class_id)")
    .eq("id", assessmentId)
    .single();
  if (!a) return { ok: false, message: "SAP não encontrado." };
  const classId = (a.class_unit as unknown as { class_id: string } | undefined)?.class_id;

  // Matrícula na turma.
  const { data: m } = await admin
    .from("class_members")
    .select("student_id")
    .eq("class_id", classId ?? "")
    .eq("student_id", user.id)
    .maybeSingle();
  if (!m) return { ok: false, message: "Você não está nesta turma." };

  const { data: existing } = await admin
    .from("sap_evaluations")
    .select("id")
    .eq("assessment_id", assessmentId)
    .eq("student_id", user.id)
    .maybeSingle();

  const payload = {
    assessment_id: assessmentId,
    student_id: user.id,
    submission_link: parsed.data.link,
    submitted_at: new Date().toISOString(),
  };
  if (existing) {
    await admin.from("sap_evaluations").update(payload).eq("id", existing.id);
  } else {
    const { error } = await admin.from("sap_evaluations").insert(payload);
    if (error) return { ok: false, message: `Erro: ${error.message}` };
  }

  if (classId) revalidatePath(`/turmas/${classId}/ucs/${a.class_unit_id}/sap/${assessmentId}`);
  return { ok: true };
}

// Carrega as marcações + feedback de um aluno (para reabrir a avaliação sem
// perder o que já foi preenchido). Só o dono da UC.
export type MarksResult =
  | { ok: true; marks: Record<string, { met: boolean; justification: string | null }>; feedback: string | null }
  | { ok: false; message: string };

export async function carregarMarcacoes(assessmentId: string, studentId: string): Promise<MarksResult> {
  const { user } = await verifySession();
  const admin = createAdminClient();
  const { data: a } = await admin
    .from("sap_assessments")
    .select("class_unit_id")
    .eq("id", assessmentId)
    .single();
  if (!a || !(await ownsClassUnit(a.class_unit_id, user.id)))
    return { ok: false, message: "Sem permissão." };

  const { data: ev } = await admin
    .from("sap_evaluations")
    .select("id, feedback")
    .eq("assessment_id", assessmentId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!ev) return { ok: true, marks: {}, feedback: null };

  const { data: mk } = await admin
    .from("sap_item_marks")
    .select("item_id, met, justification")
    .eq("evaluation_id", ev.id);
  const marks = Object.fromEntries(
    (mk ?? []).map((m) => [m.item_id, { met: m.met, justification: m.justification }]),
  );
  return { ok: true, marks, feedback: ev.feedback };
}

// -----------------------------------------------------------------------------
// PROFESSOR: preenche a lista de verificação de um aluno e fecha a nota.
// -----------------------------------------------------------------------------
export async function avaliarSap(
  assessmentId: string,
  studentId: string,
  marks: { item_id: string; met: boolean; justification?: string }[],
  feedback: string,
): Promise<ActionResult> {
  const { user } = await verifySession();
  const admin = createAdminClient();
  const { data: a } = await admin
    .from("sap_assessments")
    .select("class_unit_id, class_unit:class_units!class_unit_id(class_id)")
    .eq("id", assessmentId)
    .single();
  if (!a || !(await ownsClassUnit(a.class_unit_id, user.id)))
    return { ok: false, message: "Sem permissão." };

  // Pontos de todos os itens da rubrica (para a nota e validação).
  const { data: items } = await admin
    .from("sap_items")
    .select("id, points, criterion:sap_criteria!criterion_id(element:sap_elements!element_id(unit:sap_units!unit_id(assessment_id)))");
  const ours = (items ?? []).filter((it) => {
    const cr = it.criterion as unknown as {
      element: { unit: { assessment_id: string } };
    } | null;
    return cr?.element?.unit?.assessment_id === assessmentId;
  });
  const itemPoints = ours.map((it) => ({ id: it.id, points: Number(it.points) || 0 }));
  const validIds = new Set(itemPoints.map((i) => i.id));

  const markMap = new Map<string, boolean>();
  for (const mk of marks) {
    if (validIds.has(mk.item_id)) markMap.set(mk.item_id, Boolean(mk.met));
  }
  const { score, maxScore } = computeSapScore(itemPoints, markMap);

  // Upsert da avaliação.
  const { data: existing } = await admin
    .from("sap_evaluations")
    .select("id")
    .eq("assessment_id", assessmentId)
    .eq("student_id", studentId)
    .maybeSingle();

  let evaluationId: string;
  const evalPayload = {
    assessment_id: assessmentId,
    student_id: studentId,
    score,
    max_score: maxScore,
    feedback: feedback?.trim() || null,
    evaluated_at: new Date().toISOString(),
  };
  if (existing) {
    evaluationId = existing.id;
    await admin.from("sap_evaluations").update(evalPayload).eq("id", evaluationId);
  } else {
    const { data: created, error } = await admin
      .from("sap_evaluations")
      .insert(evalPayload)
      .select("id")
      .single();
    if (error || !created) return { ok: false, message: "Erro ao salvar avaliação." };
    evaluationId = created.id;
  }

  // Regrava as marcações.
  await admin.from("sap_item_marks").delete().eq("evaluation_id", evaluationId);
  const marksPayload = marks
    .filter((mk) => validIds.has(mk.item_id))
    .map((mk) => ({
      evaluation_id: evaluationId,
      item_id: mk.item_id,
      met: Boolean(mk.met),
      justification: mk.justification?.trim() || null,
    }));
  if (marksPayload.length) await admin.from("sap_item_marks").insert(marksPayload);

  const classId = (a.class_unit as unknown as { class_id: string } | undefined)?.class_id;
  if (classId) revalidatePath(`/turmas/${classId}/ucs/${a.class_unit_id}/sap/${assessmentId}`);
  return { ok: true, id: evaluationId };
}

"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { isProfessor, verifySession } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

// -----------------------------------------------------------------------------
// SAEP (prova teórica) — banco de questões no formato Contexto/Comando/A-E +
// justificativa por alternativa + resolução, mapeadas à matriz do curso.
// O INSTRUTOR é o dono: entrada manual é o caminho principal; a IA (em ai.ts)
// só sugere questões que ele revisa. Posse verificada no código (admin client).
// -----------------------------------------------------------------------------

export type ActionResult = { ok: true; id?: string } | { ok: false; message: string };

async function requireProfessor() {
  const { user } = await verifySession();
  if (!(await isProfessor())) throw new Error("Apenas professores.");
  return user;
}

// IA sugere uma questão (o instrutor revisa antes de salvar). Importa sob demanda
// para não puxar o SDK do Gemini quando não usado.
export type SuggestResult =
  | { ok: true; question: import("./ai").GeneratedQuestion }
  | { ok: false; message: string };

export async function sugerirQuestaoIA(input: {
  tema: string;
  competencia?: string;
  objeto?: string;
  difficulty: "facil" | "medio" | "dificil" | "desafio";
}): Promise<SuggestResult> {
  try {
    await requireProfessor();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sem permissão." };
  }
  if (!input.tema?.trim()) return { ok: false, message: "Informe um tema." };
  try {
    const { generateSaepQuestion } = await import("./ai");
    const question = await generateSaepQuestion(input);
    return { ok: true, question };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Falha na IA." };
  }
}

// =============================================================================
// MATRIZ DE COMPETÊNCIAS (por curso)
// =============================================================================
async function ownsCourse(courseId: string, userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("courses")
    .select("author_id")
    .eq("id", courseId)
    .single();
  return data?.author_id === userId;
}

// Cria a matriz do curso de uma vez (capacidades + objetos), a partir de listas.
// Idempotente: se já houver matriz para o curso, substitui o conteúdo.
const MatrixSchema = z.object({
  course_id: z.string().uuid(),
  version: z.string().trim().optional().default(""),
  competencies: z
    .array(z.object({ code: z.string().trim().min(1), description: z.string().trim().min(1) }))
    .default([]),
  knowledge_objects: z
    .array(z.object({ code: z.string().trim().min(1), name: z.string().trim().min(1) }))
    .default([]),
});

export async function salvarMatriz(input: unknown): Promise<ActionResult> {
  let user;
  try {
    user = await requireProfessor();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sem permissão." };
  }
  const parsed = MatrixSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Dados da matriz inválidos." };
  if (!(await ownsCourse(parsed.data.course_id, user.id)))
    return { ok: false, message: "Você não é autor deste curso." };

  const admin = createAdminClient();
  // Uma matriz por curso (a primeira); recriamos o conteúdo.
  let matrixId: string;
  const { data: existing } = await admin
    .from("competency_matrices")
    .select("id")
    .eq("course_id", parsed.data.course_id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    matrixId = existing.id;
    await admin.from("competency_matrices").update({ version: parsed.data.version || null }).eq("id", matrixId);
    await admin.from("competencies").delete().eq("matrix_id", matrixId);
    await admin.from("knowledge_objects").delete().eq("matrix_id", matrixId);
  } else {
    const { data, error } = await admin
      .from("competency_matrices")
      .insert({ course_id: parsed.data.course_id, version: parsed.data.version || null })
      .select("id")
      .single();
    if (error || !data) return { ok: false, message: "Erro ao criar matriz." };
    matrixId = data.id;
  }

  if (parsed.data.competencies.length) {
    await admin.from("competencies").insert(
      parsed.data.competencies.map((c, i) => ({
        matrix_id: matrixId,
        code: c.code,
        description: c.description,
        ord: i,
      })),
    );
  }
  if (parsed.data.knowledge_objects.length) {
    await admin.from("knowledge_objects").insert(
      parsed.data.knowledge_objects.map((o, i) => ({
        matrix_id: matrixId,
        code: o.code,
        name: o.name,
        ord: i,
      })),
    );
  }

  revalidatePath(`/cursos/${parsed.data.course_id}/matriz`);
  return { ok: true, id: matrixId };
}

// =============================================================================
// QUESTÕES (entrada manual — caminho principal)
// =============================================================================
const QuestionSchema = z.object({
  course_id: z.string().uuid().optional().or(z.literal("")),
  competency_id: z.string().uuid().optional().or(z.literal("")),
  knowledge_object_id: z.string().uuid().optional().or(z.literal("")),
  contexto: z.string().trim().min(5, "Escreva o contexto."),
  comando: z.string().trim().min(3, "Escreva o comando (a pergunta)."),
  resolucao: z.string().trim().max(8000).optional().default(""),
  difficulty: z.enum(["facil", "medio", "dificil", "desafio"]).default("medio"),
  is_public: z.coerce.boolean().default(false),
  options: z
    .array(
      z.object({
        label: z.string().trim().min(1),
        text: z.string().trim().min(1, "Preencha o texto da alternativa."),
        is_correct: z.boolean().default(false),
        justification: z.string().trim().max(2000).optional().default(""),
      }),
    )
    .min(2, "Inclua ao menos 2 alternativas.")
    .max(6),
});

// Cria ou atualiza uma questão com suas alternativas. Se vier `id`, edita.
export async function salvarQuestao(id: string | null, input: unknown): Promise<ActionResult> {
  let user;
  try {
    user = await requireProfessor();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sem permissão." };
  }
  const parsed = QuestionSchema.safeParse(input);
  if (!parsed.success) {
    const errs = z.flattenError(parsed.error);
    const first =
      Object.values(errs.fieldErrors).flat()[0] ?? errs.formErrors[0] ?? "Dados inválidos.";
    return { ok: false, message: String(first) };
  }
  const d = parsed.data;
  if (!d.options.some((o) => o.is_correct))
    return { ok: false, message: "Marque a alternativa correta." };

  const admin = createAdminClient();
  let questionId = id;

  const questionPayload = {
    author_id: user.id,
    course_id: d.course_id || null,
    competency_id: d.competency_id || null,
    knowledge_object_id: d.knowledge_object_id || null,
    contexto: d.contexto,
    comando: d.comando,
    resolucao: d.resolucao || null,
    difficulty: d.difficulty,
    is_public: d.is_public,
  };

  if (questionId) {
    // Só o autor edita.
    const { data: q } = await admin.from("quiz_questions").select("author_id").eq("id", questionId).single();
    if (!q || q.author_id !== user.id) return { ok: false, message: "Você não é autor desta questão." };
    const { error } = await admin.from("quiz_questions").update(questionPayload).eq("id", questionId);
    if (error) return { ok: false, message: `Erro: ${error.message}` };
    await admin.from("quiz_options").delete().eq("question_id", questionId);
  } else {
    const { data, error } = await admin.from("quiz_questions").insert(questionPayload).select("id").single();
    if (error || !data) return { ok: false, message: "Erro ao salvar a questão." };
    questionId = data.id;
  }
  if (!questionId) return { ok: false, message: "Erro ao salvar a questão." };

  const { error: optErr } = await admin.from("quiz_options").insert(
    d.options.map((o, i) => ({
      question_id: questionId,
      label: o.label || String.fromCharCode(65 + i),
      text: o.text,
      is_correct: o.is_correct,
      justification: o.justification || null,
      ord: i,
    })),
  );
  if (optErr) return { ok: false, message: `Erro nas alternativas: ${optErr.message}` };

  revalidatePath("/saep/questoes");
  return { ok: true, id: questionId };
}

export async function excluirQuestao(formData: FormData): Promise<void> {
  let user;
  try {
    user = await requireProfessor();
  } catch {
    return;
  }
  const id = formData.get("id") as string;
  const admin = createAdminClient();
  const { data: q } = await admin.from("quiz_questions").select("author_id").eq("id", id).single();
  if (!q || q.author_id !== user.id) return;
  await admin.from("quiz_questions").delete().eq("id", id);
  revalidatePath("/saep/questoes");
}

// =============================================================================
// SIMULADO (atividade da UC) + seleção de questões
// =============================================================================
async function ownsClassUnit(classUnitId: string, userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("class_units")
    .select("class:classes!class_id(owner_id)")
    .eq("id", classUnitId)
    .single();
  return (data?.class as unknown as { owner_id: string } | undefined)?.owner_id === userId;
}

const SimuladoSchema = z.object({
  title: z.string().trim().min(3, "Título muito curto."),
  description: z.string().trim().max(4000).optional().default(""),
  time_limit_min: z.coerce.number().int().min(0).max(600).optional(),
  show_feedback: z.coerce.boolean().default(true),
});

// Cria o simulado: gera a atividade (assignment kind='saep_simulado') e o registro.
export async function criarSimulado(
  classId: string,
  classUnitId: string,
  input: unknown,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireProfessor();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sem permissão." };
  }
  if (!(await ownsClassUnit(classUnitId, user.id)))
    return { ok: false, message: "Você não é dono desta turma." };
  const parsed = SimuladoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Dados do simulado inválidos." };

  const admin = createAdminClient();
  const { data: assignment, error: aErr } = await admin
    .from("assignments")
    .insert({
      class_id: classId,
      class_unit_id: classUnitId,
      title: parsed.data.title,
      kind: "saep_simulado",
    })
    .select("id")
    .single();
  if (aErr || !assignment) return { ok: false, message: "Erro ao criar atividade do simulado." };

  const { data: sim, error: sErr } = await admin
    .from("quiz_simulados")
    .insert({
      assignment_id: assignment.id,
      class_unit_id: classUnitId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      time_limit_min: parsed.data.time_limit_min || null,
      show_feedback: parsed.data.show_feedback,
    })
    .select("id")
    .single();
  if (sErr || !sim) return { ok: false, message: "Erro ao criar o simulado." };

  revalidatePath(`/turmas/${classId}/ucs/${classUnitId}/simulados/${sim.id}`);
  return { ok: true, id: sim.id };
}

// Resolve o simulado (quiz_simulados) de uma atividade saep_simulado, criando-o
// na primeira visita do professor. Permite que o simulado nasça tanto pelo hub
// genérico de atividades quanto por um botão dedicado. Retorna o id do simulado.
export async function obterOuCriarSimulado(assignmentId: string): Promise<ActionResult> {
  let user;
  try {
    user = await requireProfessor();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sem permissão." };
  }

  const admin = createAdminClient();
  const { data: assignment } = await admin
    .from("assignments")
    .select("id, title, kind, class_id, class_unit_id")
    .eq("id", assignmentId)
    .single();
  if (!assignment || assignment.kind !== "saep_simulado" || !assignment.class_unit_id)
    return { ok: false, message: "Atividade de simulado inválida." };
  if (!(await ownsClassUnit(assignment.class_unit_id, user.id)))
    return { ok: false, message: "Você não é dono desta turma." };

  const { data: existing } = await admin
    .from("quiz_simulados")
    .select("id")
    .eq("assignment_id", assignmentId)
    .maybeSingle();
  if (existing) return { ok: true, id: existing.id };

  const { data: sim, error } = await admin
    .from("quiz_simulados")
    .insert({
      assignment_id: assignmentId,
      class_unit_id: assignment.class_unit_id,
      title: assignment.title,
    })
    .select("id")
    .single();
  if (error || !sim) return { ok: false, message: "Erro ao criar o simulado." };
  return { ok: true, id: sim.id };
}

// Atualiza a configuração do simulado (título, descrição, tempo, feedback).
export async function atualizarSimulado(simuladoId: string, input: unknown): Promise<ActionResult> {
  let user;
  try {
    user = await requireProfessor();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sem permissão." };
  }
  const parsed = SimuladoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Dados do simulado inválidos." };

  const admin = createAdminClient();
  const { data: sim } = await admin
    .from("quiz_simulados")
    .select("class_unit_id, class_unit:class_units!class_unit_id(class_id)")
    .eq("id", simuladoId)
    .single();
  if (!sim || !(await ownsClassUnit(sim.class_unit_id, user.id)))
    return { ok: false, message: "Sem permissão neste simulado." };

  const { error } = await admin
    .from("quiz_simulados")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      time_limit_min: parsed.data.time_limit_min || null,
      show_feedback: parsed.data.show_feedback,
    })
    .eq("id", simuladoId);
  if (error) return { ok: false, message: `Erro: ${error.message}` };

  const classId = (sim.class_unit as unknown as { class_id: string } | undefined)?.class_id;
  if (classId)
    revalidatePath(`/turmas/${classId}/ucs/${sim.class_unit_id}/simulados/${simuladoId}`);
  return { ok: true, id: simuladoId };
}

// Define as questões do simulado (lista de question_ids, na ordem).
export async function definirQuestoesDoSimulado(
  simuladoId: string,
  questionIds: string[],
): Promise<ActionResult> {
  let user;
  try {
    user = await requireProfessor();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sem permissão." };
  }
  const admin = createAdminClient();
  const { data: sim } = await admin
    .from("quiz_simulados")
    .select("class_unit_id")
    .eq("id", simuladoId)
    .single();
  if (!sim || !(await ownsClassUnit(sim.class_unit_id, user.id)))
    return { ok: false, message: "Sem permissão neste simulado." };

  await admin.from("quiz_simulado_questions").delete().eq("simulado_id", simuladoId);
  if (questionIds.length) {
    const { error } = await admin
      .from("quiz_simulado_questions")
      .insert(questionIds.map((qid, i) => ({ simulado_id: simuladoId, question_id: qid, ord: i })));
    if (error) return { ok: false, message: `Erro: ${error.message}` };
  }
  return { ok: true };
}

// =============================================================================
// TENTATIVA DO ALUNO
// =============================================================================
async function memberOfSimulado(simuladoId: string, userId: string) {
  const admin = createAdminClient();
  const { data: sim } = await admin
    .from("quiz_simulados")
    .select("class_unit_id, class_unit:class_units!class_unit_id(class_id)")
    .eq("id", simuladoId)
    .single();
  if (!sim) return null;
  const classId = (sim.class_unit as unknown as { class_id: string } | undefined)?.class_id;
  const { data: m } = await admin
    .from("class_members")
    .select("student_id")
    .eq("class_id", classId ?? "")
    .eq("student_id", userId)
    .maybeSingle();
  return m ? { classId: classId as string, classUnitId: sim.class_unit_id as string } : null;
}

// Inicia (ou retoma) a tentativa do aluno.
export async function iniciarTentativa(simuladoId: string): Promise<ActionResult> {
  const { user } = await verifySession();
  const ctx = await memberOfSimulado(simuladoId, user.id);
  if (!ctx) return { ok: false, message: "Você não está nesta turma." };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("quiz_attempts")
    .select("id, submitted_at")
    .eq("simulado_id", simuladoId)
    .eq("student_id", user.id)
    .maybeSingle();
  if (existing) {
    if (existing.submitted_at) return { ok: false, message: "Você já enviou este simulado." };
    return { ok: true, id: existing.id };
  }

  const { count } = await admin
    .from("quiz_simulado_questions")
    .select("question_id", { count: "exact", head: true })
    .eq("simulado_id", simuladoId);

  const { data, error } = await admin
    .from("quiz_attempts")
    .insert({ simulado_id: simuladoId, student_id: user.id, total_questions: count ?? 0 })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: "Erro ao iniciar a tentativa." };
  return { ok: true, id: data.id };
}

// Envia as respostas e corrige automaticamente.
export async function enviarTentativa(
  simuladoId: string,
  answers: { question_id: string; option_id: string }[],
): Promise<ActionResult> {
  const { user } = await verifySession();
  const ctx = await memberOfSimulado(simuladoId, user.id);
  if (!ctx) return { ok: false, message: "Você não está nesta turma." };

  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("quiz_attempts")
    .select("id, submitted_at, total_questions")
    .eq("simulado_id", simuladoId)
    .eq("student_id", user.id)
    .maybeSingle();
  if (!attempt) return { ok: false, message: "Tentativa não encontrada." };
  if (attempt.submitted_at) return { ok: false, message: "Simulado já enviado." };

  // Gabarito: opções corretas das questões respondidas.
  const optionIds = answers.map((a) => a.option_id).filter(Boolean);
  const { data: opts } = optionIds.length
    ? await admin.from("quiz_options").select("id, question_id, is_correct").in("id", optionIds)
    : { data: [] };
  const correctById = new Map((opts ?? []).map((o) => [o.id, o.is_correct]));

  let correct = 0;
  const rows = answers.map((a) => {
    const isCorrect = a.option_id ? Boolean(correctById.get(a.option_id)) : false;
    if (isCorrect) correct += 1;
    return {
      attempt_id: attempt.id,
      question_id: a.question_id,
      selected_option_id: a.option_id || null,
      is_correct: isCorrect,
    };
  });

  await admin.from("quiz_answers").delete().eq("attempt_id", attempt.id);
  if (rows.length) await admin.from("quiz_answers").insert(rows);

  const total = attempt.total_questions || answers.length || 1;
  const score = Math.round((correct / total) * 100);

  await admin
    .from("quiz_attempts")
    .update({
      submitted_at: new Date().toISOString(),
      correct_count: correct,
      score,
    })
    .eq("id", attempt.id);

  // Gamificação: XP proporcional ao acerto (bônus do SAEP). Não-bloqueante.
  const xp = correct * 15;
  if (xp > 0) {
    const { data: prof } = await admin.from("profiles").select("xp").eq("id", user.id).single();
    if (prof) {
      const newXp = (prof.xp ?? 0) + xp;
      await admin
        .from("profiles")
        .update({ xp: newXp, level: Math.floor(newXp / 100) + 1 })
        .eq("id", user.id);
    }
  }

  revalidatePath(`/turmas/${ctx.classId}/ucs/${ctx.classUnitId}/simulados/${simuladoId}`);
  return { ok: true, id: attempt.id };
}

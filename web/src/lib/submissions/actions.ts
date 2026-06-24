"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { activityMeta, isCodeKind, isCreativeKind } from "@/lib/activities/registry";
import { verifySession } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

// Entregas que NÃO são código (apresentação por link, modelo de resposta).
// Código continua em exercicios/[id]/actions.ts (submitSolution).
// O status fica 'entregue' até o professor corrigir (nota manual).

export type EntregaState =
  | { ok: true; message: string }
  | { ok: false; message: string }
  | undefined;

const EntregaSchema = z.object({
  exercise_id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  link: z.string().trim().url("Informe um link válido (http...).").optional().or(z.literal("")),
  resposta: z.string().trim().max(20000).optional().default(""),
});

export async function entregarTrabalho(
  classId: string,
  _prev: EntregaState,
  formData: FormData,
): Promise<EntregaState> {
  const { user } = await verifySession();

  const parsed = EntregaSchema.safeParse({
    exercise_id: formData.get("exercise_id"),
    assignment_id: formData.get("assignment_id"),
    link: formData.get("link") ?? "",
    resposta: formData.get("resposta") ?? "",
  });
  if (!parsed.success) {
    const errs = z.flattenError(parsed.error).fieldErrors;
    return {
      ok: false,
      message: errs.link?.[0] ?? errs.resposta?.[0] ?? "Dados inválidos.",
    };
  }

  const admin = createAdminClient();

  // 1. Exercício existe e qual o tipo? Precisa ter link OU resposta conforme o tipo.
  const { data: exercise } = await admin
    .from("exercises")
    .select("id, exercise_type, is_group")
    .eq("id", parsed.data.exercise_id)
    .single();
  if (!exercise) return { ok: false, message: "Exercício não encontrado." };
  if (isCodeKind(exercise.exercise_type)) {
    return { ok: false, message: "Este exercício é de código; use o editor." };
  }

  const meta = activityMeta(exercise.exercise_type);
  if (meta.deliveryInput === "link" && !parsed.data.link) {
    return { ok: false, message: "Cole o link da sua apresentação." };
  }
  if (meta.deliveryInput === "text" && !parsed.data.resposta) {
    return { ok: false, message: "Preencha a sua resposta." };
  }

  // 2. O aluno está matriculado na turma do assignment?
  const { data: assignment } = await admin
    .from("assignments")
    .select("id, class_id")
    .eq("id", parsed.data.assignment_id)
    .single();
  if (!assignment || assignment.class_id !== classId) {
    return { ok: false, message: "Atividade inválida para esta turma." };
  }
  const { data: membership } = await admin
    .from("class_members")
    .select("student_id")
    .eq("class_id", classId)
    .eq("student_id", user.id)
    .maybeSingle();
  if (!membership) {
    return { ok: false, message: "Você não está nesta turma." };
  }

  // 3. Entrega de grupo: resolve o grupo do aluno (se houver tabelas de grupo).
  let groupId: string | null = null;
  if (exercise.is_group) {
    const { data: g } = await admin
      .from("class_group_members")
      .select("group_id, group:class_groups!group_id(class_id)")
      .eq("student_id", user.id)
      .maybeSingle();
    const grp = g?.group as unknown as { class_id: string } | undefined;
    if (g && grp?.class_id === classId) groupId = g.group_id as string;
  }

  // 4. Upsert da entrega: uma submissão por (aluno, exercício, assignment).
  // Procura entrega anterior do aluno para este exercício/assignment.
  const { data: existing } = await admin
    .from("submissions")
    .select("id")
    .eq("exercise_id", parsed.data.exercise_id)
    .eq("assignment_id", parsed.data.assignment_id)
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    exercise_id: parsed.data.exercise_id,
    assignment_id: parsed.data.assignment_id,
    student_id: user.id,
    status: "entregue" as const,
    submission_link: parsed.data.link || null,
    response_text: parsed.data.resposta || null,
    group_id: groupId,
  };

  if (existing) {
    const { error } = await admin
      .from("submissions")
      .update(payload)
      .eq("id", existing.id);
    if (error) return { ok: false, message: `Erro ao salvar: ${error.message}` };
  } else {
    const { error } = await admin.from("submissions").insert(payload);
    if (error) return { ok: false, message: `Erro ao salvar: ${error.message}` };
  }

  revalidatePath(`/turmas/${classId}/listas/${parsed.data.assignment_id}`);
  return { ok: true, message: "Entrega registrada!" };
}

// -----------------------------------------------------------------------------
// Entrega de arte (pixel/vetor/arte digital): o PNG já foi enviado ao Storage
// pelo cliente (pasta do próprio aluno); aqui gravamos o caminho + o projeto
// editável. Reusa as checagens de matrícula/grupo.
// -----------------------------------------------------------------------------

const ArteSchema = z.object({
  exercise_id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  image_path: z.string().min(1),
  project: z.string().max(5_000_000), // JSON serializado do projeto editável
});

export async function entregarArte(
  classId: string,
  payloadInput: { exercise_id: string; assignment_id: string; image_path: string; project: string },
): Promise<EntregaState> {
  const { user } = await verifySession();

  const parsed = ArteSchema.safeParse(payloadInput);
  if (!parsed.success) return { ok: false, message: "Dados da entrega inválidos." };

  // Caminho precisa estar na pasta do próprio aluno (defesa extra além do RLS).
  if (!parsed.data.image_path.startsWith(`${user.id}/`)) {
    return { ok: false, message: "Caminho de arquivo inválido." };
  }

  let project: unknown;
  try {
    project = JSON.parse(parsed.data.project);
  } catch {
    return { ok: false, message: "Projeto inválido." };
  }

  const admin = createAdminClient();

  const { data: exercise } = await admin
    .from("exercises")
    .select("id, exercise_type, is_group")
    .eq("id", parsed.data.exercise_id)
    .single();
  if (!exercise) return { ok: false, message: "Exercício não encontrado." };
  if (!isCreativeKind(exercise.exercise_type)) {
    return { ok: false, message: "Este exercício não é de arte/blocos." };
  }

  const { data: assignment } = await admin
    .from("assignments")
    .select("id, class_id")
    .eq("id", parsed.data.assignment_id)
    .single();
  if (!assignment || assignment.class_id !== classId) {
    return { ok: false, message: "Atividade inválida para esta turma." };
  }
  const { data: membership } = await admin
    .from("class_members")
    .select("student_id")
    .eq("class_id", classId)
    .eq("student_id", user.id)
    .maybeSingle();
  if (!membership) return { ok: false, message: "Você não está nesta turma." };

  let groupId: string | null = null;
  if (exercise.is_group) {
    const { data: g } = await admin
      .from("class_group_members")
      .select("group_id, group:class_groups!group_id(class_id)")
      .eq("student_id", user.id)
      .maybeSingle();
    const grp = g?.group as unknown as { class_id: string } | undefined;
    if (g && grp?.class_id === classId) groupId = g.group_id as string;
  }

  const { data: existing } = await admin
    .from("submissions")
    .select("id")
    .eq("exercise_id", parsed.data.exercise_id)
    .eq("assignment_id", parsed.data.assignment_id)
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    exercise_id: parsed.data.exercise_id,
    assignment_id: parsed.data.assignment_id,
    student_id: user.id,
    status: "entregue" as const,
    submission_image_url: parsed.data.image_path,
    submission_project: project,
    group_id: groupId,
  };

  if (existing) {
    const { error } = await admin.from("submissions").update(payload).eq("id", existing.id);
    if (error) return { ok: false, message: `Erro ao salvar: ${error.message}` };
  } else {
    const { error } = await admin.from("submissions").insert(payload);
    if (error) return { ok: false, message: `Erro ao salvar: ${error.message}` };
  }

  revalidatePath(`/turmas/${classId}/listas/${parsed.data.assignment_id}`);
  return { ok: true, message: "Arte entregue!" };
}

// Gera uma URL assinada para visualizar uma arte entregue (correção/aluno).
export async function urlAssinadaArte(path: string): Promise<string | null> {
  await verifySession();
  const admin = createAdminClient();
  const { data } = await admin.storage.from("submissoes").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

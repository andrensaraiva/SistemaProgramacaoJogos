"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { verifySession } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

// Projeto integrador (TCC): projeto (1:1 com a atividade) → sprints → board de
// tarefas por grupo. Professor dono da UC gerencia projeto/sprints; os membros
// do grupo gerenciam os cards do próprio board.
//
// Verificamos posse no código (admin client), padrão das demais actions.

export type ActionResult = { ok: true } | { ok: false; message: string };

// -----------------------------------------------------------------------------
// Helpers de posse/pertencimento
// -----------------------------------------------------------------------------
async function ownsClassUnit(classUnitId: string, userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("class_units")
    .select("class:classes!class_id(owner_id)")
    .eq("id", classUnitId)
    .single();
  const owner = (data?.class as unknown as { owner_id: string } | undefined)?.owner_id;
  return owner === userId;
}

// Retorna { classUnitId, classId } do projeto, ou null.
async function projectContext(projectId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("projects")
    .select("id, class_unit_id, class_unit:class_units!class_unit_id(class_id)")
    .eq("id", projectId)
    .single();
  if (!data) return null;
  const classId = (data.class_unit as unknown as { class_id: string } | undefined)
    ?.class_id;
  return { classUnitId: data.class_unit_id as string, classId: classId ?? null };
}

async function isGroupMember(groupId: string, userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("class_group_members")
    .select("student_id")
    .eq("group_id", groupId)
    .eq("student_id", userId)
    .maybeSingle();
  return Boolean(data);
}

// -----------------------------------------------------------------------------
// PROJETO (criado a partir de uma atividade kind='projeto_integrador')
// -----------------------------------------------------------------------------
const ProjectSchema = z.object({
  title: z.string().trim().min(3, "Título muito curto."),
  description: z.string().trim().max(20000).optional().default(""),
});

/** Cria (ou retorna) o projeto 1:1 da atividade. Idempotente por assignment. */
export async function criarOuObterProjeto(
  classId: string,
  classUnitId: string,
  assignmentId: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await verifySession();
  if (!(await ownsClassUnit(classUnitId, user.id)))
    return { ok: false, message: "Você não é dono desta turma." };

  const parsed = ProjectSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success)
    return { ok: false, message: z.flattenError(parsed.error).fieldErrors.title?.[0] ?? "Dados inválidos." };

  const admin = createAdminClient();
  const { error } = await admin.from("projects").upsert(
    {
      assignment_id: assignmentId,
      class_unit_id: classUnitId,
      title: parsed.data.title,
      description: parsed.data.description || null,
    },
    { onConflict: "assignment_id" },
  );
  if (error) return { ok: false, message: `Erro: ${error.message}` };

  revalidatePath(`/turmas/${classId}/ucs/${classUnitId}/projetos/${assignmentId}`);
  return { ok: true };
}

// -----------------------------------------------------------------------------
// SPRINTS (professor)
// -----------------------------------------------------------------------------
const SprintSchema = z.object({
  title: z.string().trim().min(2, "Título muito curto."),
  goal: z.string().trim().max(2000).optional().default(""),
  starts_on: z.string().trim().optional().default(""),
  ends_on: z.string().trim().optional().default(""),
});

export async function criarSprint(
  projectId: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await verifySession();
  const ctx = await projectContext(projectId);
  if (!ctx) return { ok: false, message: "Projeto não encontrado." };
  if (!(await ownsClassUnit(ctx.classUnitId, user.id)))
    return { ok: false, message: "Apenas o professor da turma." };

  const parsed = SprintSchema.safeParse({
    title: formData.get("title"),
    goal: formData.get("goal") ?? "",
    starts_on: formData.get("starts_on") ?? "",
    ends_on: formData.get("ends_on") ?? "",
  });
  if (!parsed.success)
    return { ok: false, message: z.flattenError(parsed.error).fieldErrors.title?.[0] ?? "Dados inválidos." };

  const admin = createAdminClient();
  const { data: last } = await admin
    .from("project_sprints")
    .select("ord")
    .eq("project_id", projectId)
    .order("ord", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ord = (last?.ord ?? 0) + 1;

  const { error } = await admin.from("project_sprints").insert({
    project_id: projectId,
    title: parsed.data.title,
    goal: parsed.data.goal || null,
    starts_on: parsed.data.starts_on || null,
    ends_on: parsed.data.ends_on || null,
    ord,
  });
  if (error) return { ok: false, message: `Erro: ${error.message}` };

  if (ctx.classId)
    revalidatePath(`/turmas/${ctx.classId}/ucs/${ctx.classUnitId}/projetos/${projectId}`);
  return { ok: true };
}

export async function excluirSprint(formData: FormData): Promise<void> {
  const { user } = await verifySession();
  const sprintId = formData.get("sprint_id") as string;
  const projectId = formData.get("project_id") as string;
  const ctx = await projectContext(projectId);
  if (!ctx || !(await ownsClassUnit(ctx.classUnitId, user.id))) return;

  const admin = createAdminClient();
  await admin.from("project_sprints").delete().eq("id", sprintId);
  if (ctx.classId)
    revalidatePath(`/turmas/${ctx.classId}/ucs/${ctx.classUnitId}/projetos/${projectId}`);
}

// -----------------------------------------------------------------------------
// TASKS / CARDS (membros do grupo — ou o professor dono)
// -----------------------------------------------------------------------------
const TaskSchema = z.object({
  title: z.string().trim().min(1, "Dê um título ao card."),
  description: z.string().trim().max(5000).optional().default(""),
  sprint_id: z.string().uuid().optional().or(z.literal("")),
  assignee_id: z.string().uuid().optional().or(z.literal("")),
});

// Pode mexer no board do grupo? Membro do grupo OU professor dono da UC.
async function canEditBoard(projectId: string, groupId: string, userId: string) {
  if (await isGroupMember(groupId, userId)) return true;
  const ctx = await projectContext(projectId);
  return ctx ? await ownsClassUnit(ctx.classUnitId, userId) : false;
}

export async function criarCard(
  projectId: string,
  groupId: string,
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await verifySession();
  if (!(await canEditBoard(projectId, groupId, user.id)))
    return { ok: false, message: "Você não participa deste grupo." };

  const parsed = TaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    sprint_id: formData.get("sprint_id") ?? "",
    assignee_id: formData.get("assignee_id") ?? "",
  });
  if (!parsed.success)
    return { ok: false, message: z.flattenError(parsed.error).fieldErrors.title?.[0] ?? "Dados inválidos." };

  const admin = createAdminClient();
  const { data: last } = await admin
    .from("project_tasks")
    .select("ord")
    .eq("project_id", projectId)
    .eq("group_id", groupId)
    .eq("status", "a_fazer")
    .order("ord", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ord = (last?.ord ?? 0) + 1;

  const { error } = await admin.from("project_tasks").insert({
    project_id: projectId,
    group_id: groupId,
    sprint_id: parsed.data.sprint_id || null,
    title: parsed.data.title,
    description: parsed.data.description || null,
    assignee_id: parsed.data.assignee_id || null,
    status: "a_fazer",
    ord,
    created_by: user.id,
  });
  if (error) return { ok: false, message: `Erro: ${error.message}` };

  await revalidateBoard(projectId);
  return { ok: true };
}

// Move o card para outra coluna (status). Sem drag: botão/select.
export async function moverCard(formData: FormData): Promise<void> {
  const { user } = await verifySession();
  const taskId = formData.get("task_id") as string;
  const status = formData.get("status") as string;
  if (!["a_fazer", "fazendo", "concluido"].includes(status)) return;

  const admin = createAdminClient();
  const { data: task } = await admin
    .from("project_tasks")
    .select("project_id, group_id")
    .eq("id", taskId)
    .single();
  if (!task) return;
  if (!(await canEditBoard(task.project_id, task.group_id, user.id))) return;

  // Coloca no fim da coluna de destino.
  const { data: last } = await admin
    .from("project_tasks")
    .select("ord")
    .eq("project_id", task.project_id)
    .eq("group_id", task.group_id)
    .eq("status", status)
    .order("ord", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ord = (last?.ord ?? 0) + 1;

  await admin
    .from("project_tasks")
    .update({ status, ord, updated_at: new Date().toISOString() })
    .eq("id", taskId);

  await revalidateBoard(task.project_id);
}

export async function excluirCard(formData: FormData): Promise<void> {
  const { user } = await verifySession();
  const taskId = formData.get("task_id") as string;
  const admin = createAdminClient();
  const { data: task } = await admin
    .from("project_tasks")
    .select("project_id, group_id")
    .eq("id", taskId)
    .single();
  if (!task) return;
  if (!(await canEditBoard(task.project_id, task.group_id, user.id))) return;

  await admin.from("project_tasks").delete().eq("id", taskId);
  await revalidateBoard(task.project_id);
}

async function revalidateBoard(projectId: string) {
  const ctx = await projectContext(projectId);
  if (ctx?.classId)
    revalidatePath(`/turmas/${ctx.classId}/ucs/${ctx.classUnitId}/projetos/${projectId}`);
}

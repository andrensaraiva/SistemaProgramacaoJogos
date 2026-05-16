"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

import { createClient } from "@/lib/supabase/server";
import { verifySession } from "@/lib/auth/dal";

export type TurmaFormState =
  | { errors?: Record<string, string[]>; message?: string }
  | undefined;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const TurmaSchema = z.object({
  name: z
    .string()
    .min(3, { error: "Nome deve ter pelo menos 3 caracteres" })
    .trim(),
  description: z.string().trim().optional(),
});

const EntrarSchema = z.object({
  invite_code: z
    .string()
    .min(1, { error: "Informe o código de convite" })
    .trim(),
});

const ListaSchema = z.object({
  title: z
    .string()
    .min(3, { error: "Título deve ter pelo menos 3 caracteres" })
    .trim(),
  kind: z.enum(["lista", "desafio", "prova"]).default("lista"),
  due_at: z.string().trim().optional(),
});

// ---------------------------------------------------------------------------
// Turmas — CRUD
// ---------------------------------------------------------------------------

export async function criarTurma(
  _prev: TurmaFormState,
  formData: FormData,
): Promise<TurmaFormState> {
  const { user } = await verifySession();

  const parsed = TurmaSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .insert({ owner_id: user.id, ...parsed.data })
    .select("id")
    .single();

  if (error || !data) {
    return { message: "Erro ao criar turma. Tente novamente." };
  }

  revalidatePath("/turmas");
  redirect(`/turmas/${data.id}`);
}

export async function editarTurma(
  id: string,
  _prev: TurmaFormState,
  formData: FormData,
): Promise<TurmaFormState> {
  await verifySession();

  const parsed = TurmaSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { message: "Erro ao atualizar turma. Tente novamente." };
  }

  revalidatePath(`/turmas/${id}`);
  redirect(`/turmas/${id}`);
}

export async function excluirTurma(formData: FormData): Promise<void> {
  await verifySession();
  const id = formData.get("id") as string;
  const supabase = await createClient();
  await supabase.from("classes").delete().eq("id", id);
  revalidatePath("/turmas");
  redirect("/turmas");
}

// ---------------------------------------------------------------------------
// Membros — entrar/sair via código de convite
// ---------------------------------------------------------------------------

export async function entrarNaTurma(
  _prev: TurmaFormState,
  formData: FormData,
): Promise<TurmaFormState> {
  const { user } = await verifySession();

  const parsed = EntrarSchema.safeParse({
    invite_code: formData.get("invite_code"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();

  const { data: cls, error: findErr } = await supabase
    .from("classes")
    .select("id")
    .eq("invite_code", parsed.data.invite_code)
    .single();

  if (findErr || !cls) {
    return { message: "Código inválido. Verifique e tente novamente." };
  }

  // Already a member?
  const { data: existing } = await supabase
    .from("class_members")
    .select("class_id")
    .eq("class_id", cls.id)
    .eq("student_id", user.id)
    .maybeSingle();

  if (existing) {
    redirect(`/turmas/${cls.id}`);
  }

  const { error: joinErr } = await supabase
    .from("class_members")
    .insert({ class_id: cls.id, student_id: user.id });

  if (joinErr) {
    return { message: "Não foi possível entrar na turma. Tente novamente." };
  }

  revalidatePath("/turmas");
  redirect(`/turmas/${cls.id}`);
}

export async function sairDaTurma(formData: FormData): Promise<void> {
  const { user } = await verifySession();
  const classId = formData.get("class_id") as string;
  const supabase = await createClient();
  await supabase
    .from("class_members")
    .delete()
    .eq("class_id", classId)
    .eq("student_id", user.id);
  revalidatePath("/turmas");
  redirect("/turmas");
}

// ---------------------------------------------------------------------------
// Listas de exercícios — CRUD
// ---------------------------------------------------------------------------

export async function criarLista(
  classId: string,
  _prev: TurmaFormState,
  formData: FormData,
): Promise<TurmaFormState> {
  await verifySession();

  const parsed = ListaSchema.safeParse({
    title: formData.get("title"),
    kind: formData.get("kind") || "lista",
    due_at: formData.get("due_at") || undefined,
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .insert({
      class_id: classId,
      title: parsed.data.title,
      kind: parsed.data.kind,
      due_at: parsed.data.due_at || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { message: "Erro ao criar lista. Tente novamente." };
  }

  revalidatePath(`/turmas/${classId}`);
  redirect(`/turmas/${classId}/listas/${data.id}`);
}

export async function excluirLista(formData: FormData): Promise<void> {
  await verifySession();
  const id = formData.get("id") as string;
  const classId = formData.get("class_id") as string;
  const supabase = await createClient();
  await supabase.from("assignments").delete().eq("id", id);
  revalidatePath(`/turmas/${classId}`);
  redirect(`/turmas/${classId}`);
}

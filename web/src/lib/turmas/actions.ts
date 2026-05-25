"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

import { verifySession } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type TurmaFormState =
  | { errors?: Record<string, string[]>; message?: string }
  | undefined;

const TurmaSchema = z.object({
  name: z.string().min(3, { error: "Nome deve ter pelo menos 3 caracteres" }).trim(),
  description: z.string().trim().optional(),
});

const EntrarSchema = z.object({
  invite_code: z.string().min(1, { error: "Informe o codigo de convite" }).trim(),
});

const ListaSchema = z.object({
  title: z.string().min(3, { error: "Titulo deve ter pelo menos 3 caracteres" }).trim(),
  kind: z.enum(["lista", "desafio", "prova"]).default("lista"),
  due_at: z.string().trim().optional(),
});

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
  let data: { id: string } | null = null;
  try {
    const result = await supabase
      .from("classes")
      .insert({ owner_id: user.id, ...parsed.data })
      .select("id")
      .single();
    if (result.error || !result.data) {
      return { message: "Erro ao criar turma. Tente novamente." };
    }
    data = result.data;
  } catch {
    return { message: "Nao foi possivel conectar ao Supabase." };
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
  try {
    const { error } = await supabase.from("classes").update(parsed.data).eq("id", id);
    if (error) return { message: "Erro ao atualizar turma. Tente novamente." };
  } catch {
    return { message: "Nao foi possivel conectar ao Supabase." };
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

  const admin = createAdminClient();
  let cls: { id: string } | null = null;

  try {
    const { data, error } = await admin
      .from("classes")
      .select("id")
      .eq("invite_code", parsed.data.invite_code)
      .maybeSingle();

    if (error || !data) {
      return { message: "Codigo invalido. Verifique e tente novamente." };
    }

    cls = data;
  } catch {
    return {
      message:
        "Nao foi possivel conectar ao Supabase agora. Tente novamente em instantes.",
    };
  }

  let alreadyMember = false;
  try {
    const { data: existing } = await admin
      .from("class_members")
      .select("class_id")
      .eq("class_id", cls.id)
      .eq("student_id", user.id)
      .maybeSingle();

    alreadyMember = Boolean(existing);
  } catch {
    return {
      message:
        "Nao foi possivel verificar sua matricula. Tente novamente em instantes.",
    };
  }

  if (alreadyMember) redirect(`/turmas/${cls.id}`);

  try {
    const { error } = await admin
      .from("class_members")
      .insert({ class_id: cls.id, student_id: user.id });

    if (error) {
      return { message: "Nao foi possivel entrar na turma. Tente novamente." };
    }
  } catch {
    return { message: "Nao foi possivel conectar ao Supabase." };
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
  let data: { id: string } | null = null;
  try {
    const result = await supabase
      .from("assignments")
      .insert({
        class_id: classId,
        title: parsed.data.title,
        kind: parsed.data.kind,
        due_at: parsed.data.due_at || null,
      })
      .select("id")
      .single();

    if (result.error || !result.data) {
      return { message: "Erro ao criar lista. Tente novamente." };
    }
    data = result.data;
  } catch {
    return { message: "Nao foi possivel conectar ao Supabase." };
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

"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { getProfile } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

// Cadastro de feriados/eventos institucionais — só admin.

export type HolidayState = { ok?: false; message?: string } | { ok: true; message: string } | undefined;

export type HolidayRow = {
  id: string;
  date: string;
  name: string;
  kind: string;
};

async function requireAdmin() {
  const profile = await getProfile();
  if (profile?.role !== "admin") throw new Error("Apenas administradores.");
  return profile;
}

const Schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Data inválida" }),
  name: z.string().trim().min(2, { error: "Informe o nome" }),
  kind: z.enum(["feriado", "recesso", "ferias", "capacitacao", "conselho", "evento"]),
});

export async function criarFeriado(
  _prev: HolidayState,
  formData: FormData,
): Promise<HolidayState> {
  let me;
  try {
    me = await requireAdmin();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sem permissão." };
  }
  const parsed = Schema.safeParse({
    date: formData.get("date"),
    name: formData.get("name"),
    kind: formData.get("kind"),
  });
  if (!parsed.success) {
    const errs = z.flattenError(parsed.error).fieldErrors;
    return { ok: false, message: errs.date?.[0] ?? errs.name?.[0] ?? "Dados inválidos." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("institution_holidays").insert({
    date: parsed.data.date,
    name: parsed.data.name,
    kind: parsed.data.kind,
    created_by: me.id,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/feriados");
  return { ok: true, message: "Feriado/evento adicionado." };
}

export async function removerFeriado(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await createAdminClient().from("institution_holidays").delete().eq("id", id);
  revalidatePath("/admin/feriados");
}

export async function listarFeriados(): Promise<HolidayRow[]> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("institution_holidays")
    .select("id, date, name, kind")
    .order("date");
  return (data ?? []) as HolidayRow[];
}

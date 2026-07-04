"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { todayLocalISO } from "@/lib/gamification/streak";
import { createAdminClient } from "@/lib/supabase/admin";

// Checklist diário do professor: confirma manualmente se fez a chamada e
// registrou o plano de aula (na plataforma externa) hoje.

export type ChecklistDia = {
  presencaFeita: boolean;
  planoRegistrado: boolean;
};

/** Estado do checklist de HOJE para o professor. */
export async function getChecklistHoje(teacherId: string): Promise<ChecklistDia> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("teacher_daily_checklist")
    .select("presenca_feita, plano_registrado")
    .eq("teacher_id", teacherId)
    .eq("check_date", todayLocalISO())
    .maybeSingle();
  return {
    presencaFeita: data?.presenca_feita ?? false,
    planoRegistrado: data?.plano_registrado ?? false,
  };
}

/** Marca/desmarca um item do checklist de hoje (upsert por professor+dia). */
export async function marcarChecklist(formData: FormData): Promise<void> {
  const { user } = await verifySession();
  const campo = formData.get("campo");
  const valor = formData.get("valor") === "true";
  if (campo !== "presenca" && campo !== "plano") return;

  const admin = createAdminClient();
  const hoje = todayLocalISO();

  // Lê o estado atual pra preservar o outro campo no upsert.
  const atual = await getChecklistHoje(user.id);
  const payload = {
    teacher_id: user.id,
    check_date: hoje,
    presenca_feita: campo === "presenca" ? valor : atual.presencaFeita,
    plano_registrado: campo === "plano" ? valor : atual.planoRegistrado,
    updated_at: new Date().toISOString(),
  };

  await admin
    .from("teacher_daily_checklist")
    .upsert(payload, { onConflict: "teacher_id,check_date" });

  revalidatePath("/painel");
}

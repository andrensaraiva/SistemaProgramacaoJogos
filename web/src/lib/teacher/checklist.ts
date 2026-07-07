"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { todayLocalISO } from "@/lib/gamification/streak";
import { createAdminClient } from "@/lib/supabase/admin";

// Checklist diário do professor POR TURMA: confirma manualmente se fez a chamada
// e registrou o plano de aula de cada turma que tem aula hoje. O professor pode
// dar aula de manhã e de tarde — cada turma do dia tem seu checklist.

export type TurmaChecklist = {
  classId: string;
  turma: string;
  uc: string | null;
  presencaFeita: boolean;
  planoRegistrado: boolean;
};

/** Turmas do professor com aula HOJE (calendário) + o estado do checklist. */
export async function getChecklistHoje(teacherId: string): Promise<TurmaChecklist[]> {
  const admin = createAdminClient();
  const hoje = todayLocalISO();

  // Turmas do professor (dono + co-docência).
  const [{ data: donas }, { data: co }] = await Promise.all([
    admin.from("classes").select("id, name").eq("owner_id", teacherId),
    admin.from("class_teachers").select("class:classes!class_id(id, name)").eq("teacher_id", teacherId),
  ]);
  const nomePorTurma = new Map<string, string>();
  for (const c of donas ?? []) nomePorTurma.set(c.id, c.name);
  for (const r of co ?? []) {
    const c = r.class as unknown as { id: string; name: string } | null;
    if (c) nomePorTurma.set(c.id, c.name);
  }
  const turmaIds = [...nomePorTurma.keys()];
  if (turmaIds.length === 0) return [];

  // Dias de calendário HOJE nessas turmas (uma turma pode ter aula hoje = manhã
  // e/ou tarde; agregamos por turma). Marker != null = feriado/recesso: pula.
  const { data: dias } = await admin
    .from("calendar_days")
    .select("marker, class_unit:class_units!class_unit_id(class_id, uc:curricular_units!uc_id(title)), calendar:course_calendars!calendar_id(class_id)")
    .eq("date", hoje);

  const turmaComAula = new Map<string, string | null>(); // classId -> uc title (primeira)
  for (const d of dias ?? []) {
    if (d.marker) continue;
    const cu = d.class_unit as unknown as { class_id: string; uc: { title: string } | null } | null;
    const cal = d.calendar as unknown as { class_id: string } | null;
    const classId = cu?.class_id ?? cal?.class_id ?? null;
    if (!classId || !turmaIds.includes(classId)) continue;
    if (!turmaComAula.has(classId)) turmaComAula.set(classId, cu?.uc?.title ?? null);
  }
  if (turmaComAula.size === 0) return [];

  // Estado do checklist de hoje por turma.
  const { data: checks } = await admin
    .from("teacher_daily_checklist")
    .select("class_id, presenca_feita, plano_registrado")
    .eq("teacher_id", teacherId)
    .eq("check_date", hoje)
    .in("class_id", [...turmaComAula.keys()]);
  const porTurma = new Map((checks ?? []).map((c) => [c.class_id, c]));

  return [...turmaComAula.entries()].map(([classId, uc]) => {
    const c = porTurma.get(classId);
    return {
      classId,
      turma: nomePorTurma.get(classId) ?? "Turma",
      uc,
      presencaFeita: c?.presenca_feita ?? false,
      planoRegistrado: c?.plano_registrado ?? false,
    };
  });
}

/** Marca/desmarca um item do checklist de hoje de uma turma (upsert). */
export async function marcarChecklist(formData: FormData): Promise<void> {
  const { user } = await verifySession();
  const campo = formData.get("campo");
  const classId = formData.get("class_id") as string | null;
  const valor = formData.get("valor") === "true";
  if ((campo !== "presenca" && campo !== "plano") || !classId) return;

  const admin = createAdminClient();
  const hoje = todayLocalISO();

  // Estado atual desta turma pra preservar o outro campo.
  const { data: atual } = await admin
    .from("teacher_daily_checklist")
    .select("presenca_feita, plano_registrado")
    .eq("teacher_id", user.id)
    .eq("class_id", classId)
    .eq("check_date", hoje)
    .maybeSingle();

  await admin.from("teacher_daily_checklist").upsert(
    {
      teacher_id: user.id,
      class_id: classId,
      check_date: hoje,
      presenca_feita: campo === "presenca" ? valor : atual?.presenca_feita ?? false,
      plano_registrado: campo === "plano" ? valor : atual?.plano_registrado ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "teacher_id,class_id,check_date" },
  );

  revalidatePath("/painel");
}

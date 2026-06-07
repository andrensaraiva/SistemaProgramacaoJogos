"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { getProfile } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

import { gerarDias, mergeGrid, type DayCell, type Holiday } from "./grid";

// Calendário do curso por turma. Admin OU dono/co-professor da turma gerencia.

export type CalendarState = { ok?: false; message?: string } | { ok: true; message: string } | undefined;

async function requireAdminOuDono(classId: string): Promise<string> {
  const profile = await getProfile();
  if (!profile) throw new Error("Sem sessão.");
  if (profile.role === "admin") return profile.id;
  if (profile.role !== "professor") throw new Error("Sem permissão.");
  const admin = createAdminClient();
  // Dono OU co-professor.
  const { data: turma } = await admin.from("classes").select("owner_id").eq("id", classId).single();
  if (turma?.owner_id === profile.id) return profile.id;
  const { data: co } = await admin
    .from("class_teachers")
    .select("teacher_id")
    .eq("class_id", classId)
    .eq("teacher_id", profile.id)
    .maybeSingle();
  if (!co) throw new Error("Você não gerencia esta turma.");
  return profile.id;
}

async function calendarClassId(calendarId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("course_calendars").select("class_id").eq("id", calendarId).single();
  return data?.class_id ?? null;
}

const SetupSchema = z.object({
  class_id: z.string().uuid(),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekdays: z.array(z.number().int().min(1).max(7)).min(1),
  aulas_por_dia: z.coerce.number().int().min(1).max(12),
});

/** Cria ou regenera o calendário da turma, preservando alocações por data. */
export async function gerarCalendario(
  _prev: CalendarState,
  formData: FormData,
): Promise<CalendarState> {
  const parsed = SetupSchema.safeParse({
    class_id: formData.get("class_id"),
    starts_on: formData.get("starts_on"),
    ends_on: formData.get("ends_on"),
    weekdays: formData.getAll("weekdays").map((w) => Number(w)),
    aulas_por_dia: formData.get("aulas_por_dia"),
  });
  if (!parsed.success) return { ok: false, message: "Preencha o período e os dias letivos." };
  const d = parsed.data;
  if (d.starts_on > d.ends_on) return { ok: false, message: "A data final deve ser depois da inicial." };

  try {
    await requireAdminOuDono(d.class_id);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sem permissão." };
  }

  const admin = createAdminClient();

  // Upsert do calendário (1 por turma).
  const { data: cal, error: calErr } = await admin
    .from("course_calendars")
    .upsert(
      {
        class_id: d.class_id,
        starts_on: d.starts_on,
        ends_on: d.ends_on,
        weekdays: d.weekdays,
        aulas_por_dia: d.aulas_por_dia,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "class_id" },
    )
    .select("id")
    .single();
  if (calErr || !cal) return { ok: false, message: calErr?.message ?? "Falha ao criar calendário." };

  // Dias anteriores (para preservar alocações).
  const { data: prevDays } = await admin
    .from("calendar_days")
    .select("date, class_unit_id, marker, note")
    .eq("calendar_id", cal.id);
  const anteriores: DayCell[] = (prevDays ?? []).map((p) => ({
    date: p.date,
    classUnitId: p.class_unit_id,
    marker: p.marker,
    note: p.note,
  }));

  // Feriados do período.
  const { data: feriados } = await admin
    .from("institution_holidays")
    .select("date, name, kind")
    .gte("date", d.starts_on)
    .lte("date", d.ends_on);
  const holidays: Holiday[] = (feriados ?? []).map((h) => ({ date: h.date, name: h.name, kind: h.kind }));

  // Gera + merge (preserva) + marca feriados.
  const datas = gerarDias(d.starts_on, d.ends_on, d.weekdays);
  const grid = mergeGrid(datas, anteriores, holidays);

  // Substitui os dias: apaga e reinsere (grade é derivada).
  await admin.from("calendar_days").delete().eq("calendar_id", cal.id);
  if (grid.length) {
    const rows = grid.map((g) => ({
      calendar_id: cal.id,
      date: g.date,
      class_unit_id: g.classUnitId,
      marker: g.marker,
      note: g.note,
    }));
    // Insere em lotes (evita payload gigante).
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await admin.from("calendar_days").insert(rows.slice(i, i + 500));
      if (error) return { ok: false, message: error.message };
    }
  }

  revalidatePath(`/turmas/${d.class_id}/calendario`);
  return { ok: true, message: `Grade gerada com ${grid.length} dia(s).` };
}

/** Aloca (ou limpa) a UC de um dia. Não mexe em dias com marker de feriado. */
export async function alocarDia(formData: FormData): Promise<void> {
  const dayId = String(formData.get("day_id") ?? "");
  const classUnitId = String(formData.get("class_unit_id") ?? "") || null;
  if (!dayId) return;

  const admin = createAdminClient();
  const { data: day } = await admin
    .from("calendar_days")
    .select("calendar_id, marker")
    .eq("id", dayId)
    .single();
  if (!day) return;
  const classId = await calendarClassId(day.calendar_id);
  if (!classId) return;
  await requireAdminOuDono(classId);

  await admin.from("calendar_days").update({ class_unit_id: classUnitId }).eq("id", dayId);
  revalidatePath(`/turmas/${classId}/calendario`);
}

/** Define/limpa um marcador manual num dia (ex.: conselho, recesso pontual). */
export async function marcarDia(formData: FormData): Promise<void> {
  const dayId = String(formData.get("day_id") ?? "");
  const marker = String(formData.get("marker") ?? "") || null;
  if (!dayId) return;

  const admin = createAdminClient();
  const { data: day } = await admin.from("calendar_days").select("calendar_id").eq("id", dayId).single();
  if (!day) return;
  const classId = await calendarClassId(day.calendar_id);
  if (!classId) return;
  await requireAdminOuDono(classId);

  // Ao marcar, limpa a UC; ao limpar marcador, mantém UC null.
  await admin
    .from("calendar_days")
    .update({ marker, class_unit_id: marker ? null : null })
    .eq("id", dayId);
  revalidatePath(`/turmas/${classId}/calendario`);
}

/** Salva as metas de CH por UC do calendário. */
export async function salvarTargets(
  _prev: CalendarState,
  formData: FormData,
): Promise<CalendarState> {
  const calendarId = String(formData.get("calendar_id") ?? "");
  if (!calendarId) return { ok: false, message: "Calendário não informado." };
  const classId = await calendarClassId(calendarId);
  if (!classId) return { ok: false, message: "Calendário não encontrado." };
  try {
    await requireAdminOuDono(classId);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sem permissão." };
  }

  // Campos no formato ch_<classUnitId> = horas.
  const admin = createAdminClient();
  const rows: { calendar_id: string; class_unit_id: string; ch_presencial: number; ord: number }[] = [];
  let ord = 0;
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("ch_")) continue;
    const classUnitId = key.slice(3);
    rows.push({
      calendar_id: calendarId,
      class_unit_id: classUnitId,
      ch_presencial: Math.max(0, Math.trunc(Number(value) || 0)),
      ord: ord++,
    });
  }
  if (rows.length) {
    const { error } = await admin
      .from("calendar_uc_targets")
      .upsert(rows, { onConflict: "calendar_id,class_unit_id" });
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath(`/turmas/${classId}/calendario`);
  return { ok: true, message: "Carga horária salva." };
}

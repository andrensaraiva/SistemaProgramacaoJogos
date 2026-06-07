"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { getProfile } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

// Salas/ambientes — admin e coordenador gerenciam. Alocação de sala por dia do
// calendário fica aqui também (definirSalaDoDia).

export type RoomState = { ok?: false; message?: string } | { ok: true; message: string } | undefined;

export type RoomRow = { id: string; name: string; capacity: number | null; kind: string };

async function requireGestao() {
  const profile = await getProfile();
  if (profile?.role !== "admin" && profile?.role !== "coordenador") {
    throw new Error("Apenas admin ou coordenador.");
  }
  return profile;
}

const Schema = z.object({
  name: z.string().trim().min(1, { error: "Informe o nome" }),
  capacity: z.coerce.number().int().min(0).optional(),
  kind: z.enum(["sala", "laboratorio", "auditorio"]),
});

export async function criarSala(_prev: RoomState, formData: FormData): Promise<RoomState> {
  let me;
  try {
    me = await requireGestao();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sem permissão." };
  }
  const parsed = Schema.safeParse({
    name: formData.get("name"),
    capacity: formData.get("capacity") || undefined,
    kind: formData.get("kind"),
  });
  if (!parsed.success) return { ok: false, message: "Preencha o nome e o tipo." };

  const admin = createAdminClient();
  const { error } = await admin.from("rooms").insert({
    name: parsed.data.name,
    capacity: parsed.data.capacity ?? null,
    kind: parsed.data.kind,
    created_by: me.id,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/salas");
  return { ok: true, message: "Sala cadastrada." };
}

export async function removerSala(formData: FormData): Promise<void> {
  await requireGestao();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await createAdminClient().from("rooms").delete().eq("id", id);
  revalidatePath("/salas");
}

export async function listarSalas(): Promise<RoomRow[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("rooms").select("id, name, capacity, kind").order("name");
  return (data ?? []) as RoomRow[];
}

/** Aloca (ou limpa) a sala de um dia do calendário. */
export async function definirSalaDoDia(formData: FormData): Promise<void> {
  const dayId = String(formData.get("day_id") ?? "");
  const roomId = String(formData.get("room_id") ?? "") || null;
  if (!dayId) return;

  const admin = createAdminClient();
  // Resolve a turma do dia para revalidar e checar permissão.
  const { data: day } = await admin
    .from("calendar_days")
    .select("calendar_id, calendar:course_calendars!calendar_id(class_id)")
    .eq("id", dayId)
    .single();
  const classId = (day?.calendar as unknown as { class_id: string } | null)?.class_id;
  if (!classId) return;

  // Permissão: admin/coordenador OU dono/co-professor da turma.
  const profile = await getProfile();
  if (!profile) return;
  const ehGestao = profile.role === "admin" || profile.role === "coordenador";
  if (!ehGestao) {
    const { data: turma } = await admin.from("classes").select("owner_id").eq("id", classId).single();
    const isOwner = turma?.owner_id === profile.id;
    const { data: co } = await admin
      .from("class_teachers")
      .select("teacher_id")
      .eq("class_id", classId)
      .eq("teacher_id", profile.id)
      .maybeSingle();
    if (!isOwner && !co) return;
  }

  await admin.from("calendar_days").update({ room_id: roomId }).eq("id", dayId);
  revalidatePath(`/turmas/${classId}/calendario`);
  revalidatePath("/salas/ocupacao");
}

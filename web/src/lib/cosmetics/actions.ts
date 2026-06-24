"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import { cosmeticById, isUnlocked, type CosmeticKind } from "./registry";

export type EquipResult = { ok: boolean; message: string };

/**
 * Equipa uma moldura (frame) ou banner no perfil do aluno. Valida no SERVIDOR
 * que o item existe e que o nível atual já o desbloqueou — não confia no client.
 */
export async function equiparCosmetico(
  kind: CosmeticKind,
  id: string,
): Promise<EquipResult> {
  const { user } = await verifySession();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("level")
    .eq("id", user.id)
    .single();
  if (!profile) return { ok: false, message: "Perfil não encontrado." };

  const cosmetic = cosmeticById(kind, id);
  if (!cosmetic) return { ok: false, message: "Item inválido." };
  if (!isUnlocked(profile.level, cosmetic)) {
    return { ok: false, message: `Desbloqueia no nível ${cosmetic.unlockLevel}.` };
  }

  const column = kind === "frame" ? "avatar_frame_id" : "banner_id";
  const { error } = await supabase
    .from("profiles")
    .update({ [column]: id })
    .eq("id", user.id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/perfil");
  return { ok: true, message: `${cosmetic.name} equipado!` };
}

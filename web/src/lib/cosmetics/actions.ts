"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

import { coinBalance } from "./coins";
import {
  cosmeticById,
  isFree,
  meetsLevel,
  type CosmeticKind,
} from "./registry";

export type ShopResult = { ok: boolean; message: string };

const EQUIP_COLUMN: Record<CosmeticKind, string> = {
  frame: "avatar_frame_id",
  banner: "banner_id",
  avatar: "avatar_skin_id",
};

/** O aluno possui este cosmético? (grátis OU comprado em user_cosmetics) */
async function owns(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  kind: CosmeticKind,
  id: string,
): Promise<boolean> {
  const item = cosmeticById(kind, id);
  if (!item) return false;
  if (isFree(item)) return true;
  const { data } = await admin
    .from("user_cosmetics")
    .select("cosmetic_id")
    .eq("user_id", userId)
    .eq("cosmetic_id", id)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Compra um cosmético com moedas. Valida no SERVIDOR (service role) o preço, o
 * nível mínimo e o saldo — o aluno não consegue se dar itens de graça.
 */
export async function comprarCosmetico(
  kind: CosmeticKind,
  id: string,
): Promise<ShopResult> {
  const { user } = await verifySession();
  const admin = createAdminClient();

  const item = cosmeticById(kind, id);
  if (!item) return { ok: false, message: "Item inválido." };
  if (isFree(item)) return { ok: true, message: "Você já possui este item." };

  const { data: profile } = await admin
    .from("profiles")
    .select("level, coins_bonus, coins_spent")
    .eq("id", user.id)
    .single();
  if (!profile) return { ok: false, message: "Perfil não encontrado." };

  if (await owns(admin, user.id, kind, id)) {
    return { ok: false, message: "Você já comprou este item." };
  }
  if (!meetsLevel(profile.level, item)) {
    return { ok: false, message: `Disponível a partir do nível ${item.minLevel}.` };
  }

  const saldo = coinBalance(profile.level, profile.coins_bonus, profile.coins_spent);
  if (saldo < item.price) {
    return { ok: false, message: `Faltam ${item.price - saldo} moedas.` };
  }

  const { error: insErr } = await admin
    .from("user_cosmetics")
    .insert({ user_id: user.id, cosmetic_id: id, kind });
  if (insErr) return { ok: false, message: insErr.message };

  const { error: updErr } = await admin
    .from("profiles")
    .update({ coins_spent: profile.coins_spent + item.price })
    .eq("id", user.id);
  if (updErr) return { ok: false, message: updErr.message };

  revalidatePath("/perfil");
  return { ok: true, message: `${item.name} comprado!` };
}

/** Equipa um cosmético que o aluno já possui (valida posse no servidor). */
export async function equiparCosmetico(
  kind: CosmeticKind,
  id: string,
): Promise<ShopResult> {
  const { user } = await verifySession();
  const admin = createAdminClient();

  const item = cosmeticById(kind, id);
  if (!item) return { ok: false, message: "Item inválido." };
  if (!(await owns(admin, user.id, kind, id))) {
    return { ok: false, message: "Compre este item antes de equipar." };
  }

  const { error } = await admin
    .from("profiles")
    .update({ [EQUIP_COLUMN[kind]]: id })
    .eq("id", user.id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/perfil");
  return { ok: true, message: `${item.name} equipado!` };
}

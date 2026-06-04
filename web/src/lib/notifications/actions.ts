"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export type Notificacao = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
  payload: Record<string, unknown> | null;
};

/** Lista as notificações do usuário atual (mais recentes primeiro). */
export async function listarNotificacoes(limit = 30): Promise<Notificacao[]> {
  const { user } = await verifySession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at, payload")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Notificacao[];
}

export async function marcarLida(formData: FormData): Promise<void> {
  const { user } = await verifySession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_id", user.id);
  revalidatePath("/", "layout");
}

export async function marcarTodasLidas(): Promise<void> {
  const { user } = await verifySession();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);
  revalidatePath("/", "layout");
}

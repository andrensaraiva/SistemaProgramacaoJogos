import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifica que existe sessão válida e devolve o `user` autenticado.
 * Redireciona para /entrar se não houver.
 *
 * Use em Server Components e Server Actions sempre que precisar do usuário.
 */
export const verifySession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  return { user };
});

/**
 * Devolve o perfil completo (com role/xp/level) do usuário autenticado.
 */
export const getProfile = cache(async () => {
  const { user } = await verifySession();
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, role, display_name, avatar_url, banner_id, avatar_frame_id, avatar_skin_id, coins_bonus, coins_spent, xp, level, duel_rating, duel_wins, duel_losses, current_streak, longest_streak, last_active_on, personal_email, institutional_email, must_change_password, profile_completed, is_master",
    )
    .eq("id", user.id)
    .single();

  if (!error && profile) return profile;

  const metadata = user.user_metadata ?? {};
  const rawRole = metadata.role;
  const role =
    rawRole === "professor" || rawRole === "admin" || rawRole === "coordenador"
      ? rawRole
      : "aluno";
  const displayName =
    typeof metadata.display_name === "string" && metadata.display_name.trim()
      ? metadata.display_name.trim()
      : user.email?.split("@")[0] ?? "Aluno";

  const admin = createAdminClient();
  const { data: repairedProfile, error: repairError } = await admin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        role,
        display_name: displayName,
      },
      { onConflict: "id" },
    )
    .select(
      "id, role, display_name, avatar_url, banner_id, avatar_frame_id, avatar_skin_id, coins_bonus, coins_spent, xp, level, duel_rating, duel_wins, duel_losses, current_streak, longest_streak, last_active_on, personal_email, institutional_email, must_change_password, profile_completed, is_master",
    )
    .single();

  if (repairError || !repairedProfile) return null;
  return repairedProfile;
});

export const isProfessor = cache(async () => {
  const profile = await getProfile();
  return (
    profile?.role === "professor" ||
    profile?.role === "admin" ||
    profile?.role === "coordenador"
  );
});

export const isAdmin = cache(async () => {
  const profile = await getProfile();
  return profile?.role === "admin";
});

export const isCoordenador = cache(async () => {
  const profile = await getProfile();
  return profile?.role === "coordenador";
});

/** Quem gerencia turmas como gestão ampla (coordenador ou admin). */
export const isGestaoTurmas = cache(async () => {
  const profile = await getProfile();
  return profile?.role === "coordenador" || profile?.role === "admin";
});

export const isMasterAdmin = cache(async () => {
  const profile = await getProfile();
  return profile?.role === "admin" && profile?.is_master === true;
});

/** Quantidade de notificações não lidas do usuário atual (para o sino). */
export const contarNaoLidas = cache(async () => {
  const { user } = await verifySession();
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null);
  return count ?? 0;
});

import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

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
    .select("id, role, display_name, avatar_url, xp, level")
    .eq("id", user.id)
    .single();

  if (error || !profile) return null;
  return profile;
});

export const isProfessor = cache(async () => {
  const profile = await getProfile();
  return profile?.role === "professor" || profile?.role === "admin";
});

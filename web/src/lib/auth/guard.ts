import "server-only";

import { redirect } from "next/navigation";

import type { Role } from "@/lib/features";

import { getProfile } from "./dal";
import { homeDe, pode, type Capability } from "./permissions";

// Guards de página/rota baseados em capacidades. Centralizam o padrão que antes
// se repetia em ~38 telas (getProfile + role===X + redirect). Ver permissions.ts.

export type GuardedProfile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;

/**
 * Exige a capacidade `cap`. Se o usuário não a tiver, redireciona para a home
 * do papel dele. Devolve o profile (evita refetch na tela).
 * Uso: `const profile = await requireCapability("ver_relatorios");`
 */
export async function requireCapability(cap: Capability): Promise<GuardedProfile> {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  const role = profile.role as Role;
  if (!pode(role, cap, { isMaster: profile.is_master === true })) {
    redirect(homeDe(role));
  }
  return profile;
}

/** Exige um dos papéis. Quando capability não se aplica (ex.: tela de papel). */
export async function requireRole(roles: Role[]): Promise<GuardedProfile> {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  const role = profile.role as Role;
  if (!roles.includes(role)) redirect(homeDe(role));
  return profile;
}

/**
 * Versão sem redirect, para route handlers (export CSV etc.): devolve bool.
 * O chamador responde 403 quando false.
 */
export async function canCapability(cap: Capability): Promise<boolean> {
  const profile = await getProfile();
  if (!profile) return false;
  return pode(profile.role as Role, cap, { isMaster: profile.is_master === true });
}

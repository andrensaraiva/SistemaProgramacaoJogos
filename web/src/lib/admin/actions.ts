"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { getProfile } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarConta, resetarSenhaTemporaria } from "@/lib/identidades/service";
import { isValidEmail, normalizeEmail } from "@/lib/identidades/parse";

// -----------------------------------------------------------------------------
// Actions do painel admin — só admin. Criar professor (1 a 1) e resolver pedidos
// de reset de senha (de professores e alunos).
// -----------------------------------------------------------------------------

export type AdminActionState =
  | { ok?: false; errors?: Record<string, string[]>; message?: string }
  | { ok: true; message: string; tempPassword?: string }
  | undefined;

async function requireAdmin() {
  const profile = await getProfile();
  if (profile?.role !== "admin") {
    throw new Error("Apenas administradores podem executar esta ação.");
  }
  return profile;
}

const ProfessorSchema = z
  .object({
    display_name: z.string().trim().min(2, { error: "Nome obrigatório" }),
    institutional_email: z.string().trim().optional(),
    personal_email: z.string().trim().optional(),
  })
  .refine(
    (d) =>
      (d.institutional_email && d.institutional_email.length > 0) ||
      (d.personal_email && d.personal_email.length > 0),
    { error: "Informe ao menos um e-mail", path: ["institutional_email"] },
  );

export async function criarProfessor(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const parsed = ProfessorSchema.safeParse({
    display_name: formData.get("display_name"),
    institutional_email: formData.get("institutional_email") || undefined,
    personal_email: formData.get("personal_email") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  }

  const institutional = normalizeEmail(parsed.data.institutional_email ?? null);
  const personal = normalizeEmail(parsed.data.personal_email ?? null);
  for (const e of [institutional, personal]) {
    if (e && !isValidEmail(e)) return { ok: false, message: `E-mail inválido: ${e}` };
  }

  const res = await criarConta({
    displayName: parsed.data.display_name,
    role: "professor",
    institutionalEmail: institutional,
    personalEmail: personal,
    createdBy: admin.id,
  });
  if (!res.ok) return { ok: false, message: res.error };

  revalidatePath("/admin");
  return {
    ok: true,
    message: `Professor criado. Senha temporária: ${res.tempPassword}`,
    tempPassword: res.tempPassword,
  };
}

// -----------------------------------------------------------------------------
// Resolver pedido de reset (aprovar gera senha temporária / recusar arquiva)
// -----------------------------------------------------------------------------

const ResolverSchema = z.object({
  request_id: z.string().uuid(),
  acao: z.enum(["aprovar", "recusar"]),
});

export async function resolverPedidoReset(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const resolver = await requireAdmin();
  return resolverPedidoComo(resolver.id, formData);
}

/**
 * Núcleo compartilhado entre admin e professor (a checagem de permissão fica no
 * RLS via service-role + no chamador). Aprova → reseta senha; recusa → arquiva.
 */
export async function resolverPedidoComo(
  resolverId: string,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = ResolverSchema.safeParse({
    request_id: formData.get("request_id"),
    acao: formData.get("acao"),
  });
  if (!parsed.success) return { ok: false, message: "Pedido inválido." };

  const admin = createAdminClient();
  const { data: pedido } = await admin
    .from("password_reset_requests")
    .select("id, requester_id, status, requester:profiles!requester_id(display_name)")
    .eq("id", parsed.data.request_id)
    .single();

  if (!pedido) return { ok: false, message: "Pedido não encontrado." };
  if (pedido.status !== "pendente") {
    return { ok: false, message: "Este pedido já foi resolvido." };
  }

  if (parsed.data.acao === "recusar") {
    await admin
      .from("password_reset_requests")
      .update({ status: "recusado", resolved_by: resolverId, resolved_at: new Date().toISOString() })
      .eq("id", pedido.id);
    revalidatePath("/admin");
    return { ok: true, message: "Pedido recusado." };
  }

  const res = await resetarSenhaTemporaria(pedido.requester_id);
  if (!res.ok) return { ok: false, message: res.error };

  await admin
    .from("password_reset_requests")
    .update({ status: "aprovado", resolved_by: resolverId, resolved_at: new Date().toISOString() })
    .eq("id", pedido.id);

  // Avisa o solicitante que a senha foi redefinida (sem expor a senha aqui).
  await admin.from("notifications").insert({
    recipient_id: pedido.requester_id,
    type: "reset_aprovado",
    title: "Sua senha foi redefinida",
    body: "Use a senha temporária informada pelo responsável e troque no primeiro acesso.",
    link: "/entrar",
  });

  revalidatePath("/admin");
  const nome =
    (pedido.requester as unknown as { display_name: string } | null)?.display_name ?? "o usuário";
  return {
    ok: true,
    message: `Senha de ${nome} redefinida. Senha temporária: ${res.tempPassword}`,
    tempPassword: res.tempPassword,
  };
}

/** Reset direto de um professor (sem pedido prévio), iniciado pelo admin. */
export async function resetarSenhaProfessor(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const resolver = await requireAdmin();
  const targetId = String(formData.get("professor_id") ?? "");
  if (!targetId) return { ok: false, message: "Professor não informado." };

  const res = await resetarSenhaTemporaria(targetId);
  if (!res.ok) return { ok: false, message: res.error };

  await createAdminClient()
    .from("notifications")
    .insert({
      recipient_id: targetId,
      type: "reset_aprovado",
      title: "Sua senha foi redefinida",
      body: "Use a senha temporária informada pelo administrador e troque no primeiro acesso.",
      link: "/entrar",
    });

  revalidatePath("/admin");
  void resolver;
  return { ok: true, message: `Senha redefinida. Senha temporária: ${res.tempPassword}`, tempPassword: res.tempPassword };
}

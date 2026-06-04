import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { canonicalEmail, generateTempPassword, normalizeEmail } from "./parse";

// -----------------------------------------------------------------------------
// Operações privilegiadas de identidade (service-role). NUNCA importar no client.
// Centraliza criação de conta, reset de senha e resolução do email canônico —
// reutilizado por admin (cria professor), professor (cria aluno) e pelo login.
// -----------------------------------------------------------------------------

export type CriarContaInput = {
  displayName: string;
  role: "aluno" | "professor";
  institutionalEmail: string | null;
  personalEmail: string | null;
  createdBy: string;
};

export type CriarContaResult =
  | { ok: true; userId: string; canonical: string; tempPassword: string }
  | { ok: false; error: string };

/**
 * Cria uma conta de aluno/professor com senha temporária, já marcada para trocar
 * a senha e completar o perfil no primeiro acesso. O email canônico (do Auth) é o
 * institucional quando há; senão o pessoal. Os dois emails ficam no metadata para
 * o trigger `handle_new_user` gravar em `profiles` (permitindo login por ambos).
 */
export async function criarConta(input: CriarContaInput): Promise<CriarContaResult> {
  const canonical = canonicalEmail(input);
  if (!canonical) return { ok: false, error: "É preciso ao menos um email." };

  const institutional = normalizeEmail(input.institutionalEmail);
  const personal = normalizeEmail(input.personalEmail);
  const tempPassword = generateTempPassword();
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email: canonical,
    password: tempPassword,
    email_confirm: true, // sem SMTP: já confirma para permitir login imediato
    user_metadata: {
      display_name: input.displayName,
      role: input.role,
      institutional_email: institutional,
      personal_email: personal,
      must_change_password: true,
      profile_completed: false,
      created_by: input.createdBy,
    },
  });

  if (error || !data.user) {
    const msg = error?.message ?? "Falha ao criar conta";
    if (/already.*registered|exists/i.test(msg)) {
      return { ok: false, error: "Este email já está cadastrado." };
    }
    return { ok: false, error: msg };
  }

  return { ok: true, userId: data.user.id, canonical, tempPassword };
}

/**
 * Resolve o email digitado no login para o email canônico do Auth. Se o usuário
 * digitou o email pessoal (ou o institucional que coincide com o canônico),
 * devolve o email registrado em `auth.users`. Retorna null se não encontrar —
 * o chamador deve responder de forma neutra (não vazar existência).
 */
export async function resolveCanonicalEmail(typed: string): Promise<string | null> {
  const email = normalizeEmail(typed);
  if (!email) return null;
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, institutional_email, personal_email")
    .or(`institutional_email.eq.${email},personal_email.eq.${email}`)
    .maybeSingle();

  if (!profile) {
    // Pode ser que o email digitado já seja o canônico do Auth mas não esteja
    // espelhado em profiles (contas antigas) — deixa o login tentar direto.
    return email;
  }

  const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
  return authUser.user?.email ?? email;
}

/**
 * Define uma nova senha temporária para um usuário e o marca para trocar no
 * próximo acesso. Usado pelo fluxo de reset (admin/professor aprovam).
 */
export async function resetarSenhaTemporaria(
  userId: string,
): Promise<{ ok: true; tempPassword: string } | { ok: false; error: string }> {
  const tempPassword = generateTempPassword();
  const admin = createAdminClient();

  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    password: tempPassword,
  });
  if (authError) return { ok: false, error: authError.message };

  const { error: profileError } = await admin
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", userId);
  if (profileError) return { ok: false, error: profileError.message };

  return { ok: true, tempPassword };
}

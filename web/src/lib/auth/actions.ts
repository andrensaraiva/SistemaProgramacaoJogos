"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/identidades/parse";
import { resolveCanonicalEmail } from "@/lib/identidades/service";

import { verifySession } from "./dal";

// -----------------------------------------------------------------------------
// Esquemas de validação
// -----------------------------------------------------------------------------

const LoginSchema = z.object({
  email: z.string().trim().min(1, { error: "Informe seu e-mail" }),
  password: z.string().min(1, { error: "Informe sua senha" }),
});

export type AuthFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

// -----------------------------------------------------------------------------
// Login — aceita o email pessoal OU o institucional (resolve para o canônico)
// -----------------------------------------------------------------------------

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  // O aluno pode digitar o email pessoal ou o institucional. O Auth conhece só o
  // canônico, então resolvemos antes de autenticar.
  const canonical = await resolveCanonicalEmail(parsed.data.email);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: canonical ?? parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { message: traduzErroSupabase(error.message) };
  }

  // Se a conta precisa de primeiro acesso (trocar senha / completar perfil),
  // manda para o wizard — independentemente do `proximo`.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("must_change_password, profile_completed")
      .eq("id", user.id)
      .single();
    if (profile && (profile.must_change_password || !profile.profile_completed)) {
      revalidatePath("/", "layout");
      redirect("/primeiro-acesso");
    }
  }

  revalidatePath("/", "layout");
  const proximo = (formData.get("proximo") as string) || "/painel";
  redirect(proximo);
}

// -----------------------------------------------------------------------------
// Logout
// -----------------------------------------------------------------------------

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}

// -----------------------------------------------------------------------------
// Esqueci minha senha — cria pedido + notifica quem pode aprovar
// -----------------------------------------------------------------------------

const ResetSchema = z.object({
  email: z.string().trim().min(1, { error: "Informe seu e-mail" }),
});

const RESPOSTA_NEUTRA =
  "Se a conta existir, enviamos sua solicitação ao professor/admin responsável.";

export async function solicitarReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = ResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const email = normalizeEmail(parsed.data.email);
  if (!email) return { message: RESPOSTA_NEUTRA };

  const admin = createAdminClient();

  // Acha o perfil pelo email pessoal ou institucional. Resposta sempre neutra.
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, display_name")
    .or(`institutional_email.eq.${email},personal_email.eq.${email}`)
    .maybeSingle();

  if (!profile) return { message: RESPOSTA_NEUTRA };

  // Evita acumular pedidos pendentes duplicados.
  const { data: pendente } = await admin
    .from("password_reset_requests")
    .select("id")
    .eq("requester_id", profile.id)
    .eq("status", "pendente")
    .maybeSingle();

  let requestId = pendente?.id;
  if (!requestId) {
    const { data: novo } = await admin
      .from("password_reset_requests")
      .insert({ requester_id: profile.id, requester_role: profile.role })
      .select("id")
      .single();
    requestId = novo?.id;
  }

  // Destinatários: aluno → professores que o ensinam + todos os admins;
  // professor → só admins.
  const recipientIds = new Set<string>();

  const { data: admins } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin");
  for (const a of admins ?? []) recipientIds.add(a.id);

  if (profile.role === "aluno") {
    // Professores donos de alguma turma onde o aluno é membro.
    const { data: turmas } = await admin
      .from("class_members")
      .select("class:classes!class_id(owner_id)")
      .eq("student_id", profile.id);
    for (const t of turmas ?? []) {
      const ownerId = (t.class as unknown as { owner_id: string } | null)?.owner_id;
      if (ownerId) recipientIds.add(ownerId);
    }
  }

  recipientIds.delete(profile.id);

  if (recipientIds.size > 0 && requestId) {
    const rows = [...recipientIds].map((rid) => ({
      recipient_id: rid,
      type: "reset_senha",
      title: "Pedido de redefinição de senha",
      body: `${profile.display_name} solicitou a redefinição de senha.`,
      link: profile.role === "aluno" ? "/painel" : "/admin",
      payload: { request_id: requestId, requester_id: profile.id, role: profile.role },
    }));
    await admin.from("notifications").insert(rows);
  }

  return { message: RESPOSTA_NEUTRA };
}

// -----------------------------------------------------------------------------
// Primeiro acesso — trocar senha + completar perfil
// -----------------------------------------------------------------------------

const PrimeiroAcessoSchema = z
  .object({
    password: z.string().min(8, { error: "A nova senha deve ter pelo menos 8 caracteres" }),
    confirm: z.string(),
    personal_email: z.string().trim().optional(),
    institutional_email: z.string().trim().optional(),
  })
  .refine((d) => d.password === d.confirm, {
    error: "As senhas não coincidem",
    path: ["confirm"],
  })
  .refine(
    (d) => (d.personal_email && d.personal_email.length > 0) ||
      (d.institutional_email && d.institutional_email.length > 0),
    { error: "Informe ao menos um e-mail", path: ["institutional_email"] },
  );

export async function concluirPrimeiroAcesso(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { user } = await verifySession();

  const parsed = PrimeiroAcessoSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
    personal_email: formData.get("personal_email") || undefined,
    institutional_email: formData.get("institutional_email") || undefined,
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const personal = normalizeEmail(parsed.data.personal_email ?? null);
  const institutional = normalizeEmail(parsed.data.institutional_email ?? null);

  // Atualiza a senha na sessão atual do usuário.
  const supabase = await createClient();
  const { error: pwError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (pwError) return { message: traduzErroSupabase(pwError.message) };

  // Completa o perfil e libera o usuário (service-role: os emails têm índice
  // único, então um email já em uso por outra conta retorna erro tratável).
  const admin = createAdminClient();
  const { error: profError } = await admin
    .from("profiles")
    .update({
      personal_email: personal,
      institutional_email: institutional,
      must_change_password: false,
      profile_completed: true,
    })
    .eq("id", user.id);

  if (profError) {
    if (profError.code === "23505") {
      return { message: "Um dos e-mails informados já está em uso." };
    }
    return { message: profError.message };
  }

  revalidatePath("/", "layout");
  redirect("/painel");
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function traduzErroSupabase(msg: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "E-mail ou senha incorretos",
    "User already registered": "Esse e-mail já está cadastrado",
    "Email not confirmed":
      "Confirme seu e-mail antes de entrar (veja sua caixa de entrada)",
    "Password should be at least 6 characters":
      "Senha deve ter pelo menos 6 caracteres",
    "New password should be different from the old password.":
      "A nova senha deve ser diferente da senha temporária",
  };
  return map[msg] ?? msg;
}

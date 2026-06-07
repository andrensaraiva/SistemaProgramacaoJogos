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
  let isAdminRole = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, must_change_password, profile_completed, disabled_at")
      .eq("id", user.id)
      .single();
    if (profile?.disabled_at) {
      await supabase.auth.signOut();
      return { message: "Esta conta está suspensa. Procure o administrador." };
    }
    if (profile && (profile.must_change_password || !profile.profile_completed)) {
      revalidatePath("/", "layout");
      redirect("/primeiro-acesso");
    }
    isAdminRole = profile?.role === "admin";
  }

  revalidatePath("/", "layout");
  // Admin é administrativo → cai no painel admin. Demais → painel normal (ou o
  // destino solicitado).
  if (isAdminRole) redirect("/admin");
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
  // professor → só admins. O LINK aponta para onde cada um pode resolver:
  // admin → /admin (fila de reset); professor → a turma do aluno (fila lá).
  const adminIds = new Set<string>();
  const profByClass = new Map<string, string>(); // ownerId -> classId (para o link)

  const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin");
  for (const a of admins ?? []) adminIds.add(a.id);

  if (profile.role === "aluno") {
    // Professores (dono ou co-docente) de alguma turma onde o aluno é membro.
    const { data: turmas } = await admin
      .from("class_members")
      .select("class_id, class:classes!class_id(owner_id)")
      .eq("student_id", profile.id);
    for (const t of turmas ?? []) {
      const ownerId = (t.class as unknown as { owner_id: string } | null)?.owner_id;
      if (ownerId && ownerId !== profile.id) profByClass.set(ownerId, t.class_id as string);
    }
    // Co-professores também recebem (na turma onde co-lecionam o aluno).
    const classIds = (turmas ?? []).map((t) => t.class_id as string);
    if (classIds.length) {
      const { data: cos } = await admin
        .from("class_teachers")
        .select("teacher_id, class_id")
        .in("class_id", classIds);
      for (const c of cos ?? []) {
        if (c.teacher_id !== profile.id) profByClass.set(c.teacher_id, c.class_id);
      }
    }
  }
  adminIds.delete(profile.id);

  const rows: {
    recipient_id: string;
    type: string;
    title: string;
    body: string;
    link: string;
    payload: Record<string, unknown>;
  }[] = [];
  const payload = { request_id: requestId, requester_id: profile.id, role: profile.role };
  const title = "Pedido de redefinição de senha";
  const body = `${profile.display_name} solicitou a redefinição de senha.`;

  for (const aid of adminIds) {
    rows.push({ recipient_id: aid, type: "reset_senha", title, body, link: "/admin", payload });
  }
  for (const [pid, classId] of profByClass) {
    rows.push({
      recipient_id: pid,
      type: "reset_senha",
      title,
      body,
      link: `/turmas/${classId}/alunos`,
      payload,
    });
  }

  if (rows.length && requestId) {
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

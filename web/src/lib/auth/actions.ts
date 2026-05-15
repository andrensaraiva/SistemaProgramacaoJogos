"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

import { createClient } from "@/lib/supabase/server";

// -----------------------------------------------------------------------------
// Esquemas de validação
// -----------------------------------------------------------------------------

const LoginSchema = z.object({
  email: z.email({ error: "E-mail inválido" }).trim(),
  password: z.string().min(1, { error: "Informe sua senha" }),
});

const SignupSchema = z.object({
  display_name: z
    .string()
    .min(2, { error: "Nome deve ter pelo menos 2 caracteres" })
    .trim(),
  email: z.email({ error: "E-mail inválido" }).trim(),
  password: z
    .string()
    .min(6, { error: "Senha deve ter pelo menos 6 caracteres" }),
  role: z.enum(["aluno", "professor"]).default("aluno"),
});

export type AuthFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

// -----------------------------------------------------------------------------
// Login
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { message: traduzErroSupabase(error.message) };
  }

  revalidatePath("/", "layout");
  const proximo = (formData.get("proximo") as string) || "/painel";
  redirect(proximo);
}

// -----------------------------------------------------------------------------
// Cadastro
// -----------------------------------------------------------------------------

export async function signup(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = SignupSchema.safeParse({
    display_name: formData.get("display_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") || "aluno",
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.display_name,
        role: parsed.data.role,
      },
    },
  });

  if (error) {
    return { message: traduzErroSupabase(error.message) };
  }

  revalidatePath("/", "layout");
  redirect("/painel");
}

// -----------------------------------------------------------------------------
// Logout
// -----------------------------------------------------------------------------

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
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
  };
  return map[msg] ?? msg;
}

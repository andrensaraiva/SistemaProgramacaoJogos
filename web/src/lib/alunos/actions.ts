"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { getProfile } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarConta, resetarSenhaTemporaria } from "@/lib/identidades/service";
import {
  canonicalEmail,
  isValidEmail,
  normalizeEmail,
  parseStudentsText,
  type ParsedStudent,
} from "@/lib/identidades/parse";

// -----------------------------------------------------------------------------
// Actions de cadastro de alunos pelo PROFESSOR dono da turma. Um a um ou em
// massa (texto colado / CSV / formulário dinâmico, todos viram lista parseada).
// -----------------------------------------------------------------------------

export type AlunoLinha = {
  displayName: string;
  status: "criado" | "matriculado" | "erro";
  tempPassword?: string;
  message?: string;
};

export type AlunosActionState =
  | { ok?: false; message?: string; errors?: Record<string, string[]> }
  | { ok: true; resultado: AlunoLinha[] }
  | undefined;

/** Confere que o usuário atual é dono da turma (professor/admin). */
async function requireDonoTurma(classId: string): Promise<string> {
  const profile = await getProfile();
  if (!profile || (profile.role !== "professor" && profile.role !== "admin")) {
    throw new Error("Apenas professores podem cadastrar alunos.");
  }
  const admin = createAdminClient();
  const { data: turma } = await admin
    .from("classes")
    .select("owner_id")
    .eq("id", classId)
    .single();
  if (!turma || (turma.owner_id !== profile.id && profile.role !== "admin")) {
    throw new Error("Você não é o dono desta turma.");
  }
  return profile.id;
}

/**
 * Cria (ou reaproveita) UM aluno e o matricula na turma. Coração compartilhado
 * entre o cadastro 1 a 1 e o em massa.
 */
async function provisionarAluno(
  row: ParsedStudent,
  classId: string,
  createdBy: string,
): Promise<AlunoLinha> {
  const admin = createAdminClient();
  const canonical = canonicalEmail(row);
  if (!canonical) {
    return { displayName: row.displayName, status: "erro", message: "Sem e-mail válido." };
  }

  // Já existe um perfil com algum desses emails? Então só matricula.
  const emails = [row.institutionalEmail, row.personalEmail].filter(
    (e): e is string => !!e,
  );
  const orFilter = emails
    .map((e) => `institutional_email.eq.${e},personal_email.eq.${e}`)
    .join(",");
  const { data: existente } = await admin
    .from("profiles")
    .select("id, role")
    .or(orFilter)
    .maybeSingle();

  if (existente) {
    if (existente.role !== "aluno") {
      return { displayName: row.displayName, status: "erro", message: "E-mail já usado por um não-aluno." };
    }
    const { error } = await admin
      .from("class_members")
      .upsert({ class_id: classId, student_id: existente.id }, { onConflict: "class_id,student_id" });
    if (error) return { displayName: row.displayName, status: "erro", message: error.message };
    return { displayName: row.displayName, status: "matriculado" };
  }

  const res = await criarConta({
    displayName: row.displayName,
    role: "aluno",
    institutionalEmail: row.institutionalEmail,
    personalEmail: row.personalEmail,
    createdBy,
  });
  if (!res.ok) return { displayName: row.displayName, status: "erro", message: res.error };

  const { error: enrollError } = await admin
    .from("class_members")
    .insert({ class_id: classId, student_id: res.userId });
  if (enrollError) {
    return { displayName: row.displayName, status: "erro", message: enrollError.message };
  }

  return { displayName: row.displayName, status: "criado", tempPassword: res.tempPassword };
}

// -----------------------------------------------------------------------------
// 1 a 1
// -----------------------------------------------------------------------------

const UmAlunoSchema = z
  .object({
    class_id: z.string().uuid(),
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

export async function criarAluno(
  _prev: AlunosActionState,
  formData: FormData,
): Promise<AlunosActionState> {
  const parsed = UmAlunoSchema.safeParse({
    class_id: formData.get("class_id"),
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

  const createdBy = await requireDonoTurma(parsed.data.class_id);
  const linha = await provisionarAluno(
    { line: 1, displayName: parsed.data.display_name, institutionalEmail: institutional, personalEmail: personal },
    parsed.data.class_id,
    createdBy,
  );

  revalidatePath(`/turmas/${parsed.data.class_id}/alunos`);
  return { ok: true, resultado: [linha] };
}

// -----------------------------------------------------------------------------
// Em massa (texto colado / CSV / formulário dinâmico → tudo vira texto)
// -----------------------------------------------------------------------------

export async function criarAlunosEmMassa(
  _prev: AlunosActionState,
  formData: FormData,
): Promise<AlunosActionState> {
  const classId = String(formData.get("class_id") ?? "");
  if (!classId) return { ok: false, message: "Turma não informada." };

  const texto = String(formData.get("alunos") ?? "");
  const { rows, errors } = parseStudentsText(texto);

  if (rows.length === 0) {
    return {
      ok: false,
      message:
        errors.length > 0
          ? `Nenhuma linha válida. Primeiro erro (linha ${errors[0].line}): ${errors[0].message}`
          : "Cole ao menos um aluno.",
    };
  }

  const createdBy = await requireDonoTurma(classId);

  const resultado: AlunoLinha[] = [];
  // Erros de parse entram no relatório como linhas com erro.
  for (const e of errors) {
    resultado.push({ displayName: `Linha ${e.line}`, status: "erro", message: e.message });
  }
  for (const row of rows) {
    resultado.push(await provisionarAluno(row, classId, createdBy));
  }

  revalidatePath(`/turmas/${classId}/alunos`);
  return { ok: true, resultado };
}

// -----------------------------------------------------------------------------
// Reset de senha de aluno pelo professor (com ou sem pedido prévio)
// -----------------------------------------------------------------------------

/** Confere que o professor atual ensina o aluno (é dono de alguma turma dele). */
async function requireEnsinaAluno(alunoId: string): Promise<string> {
  const profile = await getProfile();
  if (!profile || (profile.role !== "professor" && profile.role !== "admin")) {
    throw new Error("Apenas professores podem redefinir senha de aluno.");
  }
  if (profile.role === "admin") return profile.id;

  const admin = createAdminClient();
  const { data } = await admin
    .from("class_members")
    .select("class:classes!class_id(owner_id)")
    .eq("student_id", alunoId);
  const ensina = (data ?? []).some(
    (m) => (m.class as unknown as { owner_id: string } | null)?.owner_id === profile.id,
  );
  if (!ensina) throw new Error("Você não ensina este aluno.");
  return profile.id;
}

export async function resetarSenhaAluno(
  _prev: AlunosActionState,
  formData: FormData,
): Promise<AlunosActionState> {
  const alunoId = String(formData.get("aluno_id") ?? "");
  const classId = String(formData.get("class_id") ?? "");
  if (!alunoId) return { ok: false, message: "Aluno não informado." };

  const resolverId = await requireEnsinaAluno(alunoId);
  const res = await resetarSenhaTemporaria(alunoId);
  if (!res.ok) return { ok: false, message: res.error };

  const admin = createAdminClient();
  // Resolve qualquer pedido pendente do aluno e notifica.
  await admin
    .from("password_reset_requests")
    .update({ status: "aprovado", resolved_by: resolverId, resolved_at: new Date().toISOString() })
    .eq("requester_id", alunoId)
    .eq("status", "pendente");
  await admin.from("notifications").insert({
    recipient_id: alunoId,
    type: "reset_aprovado",
    title: "Sua senha foi redefinida",
    body: "Use a senha temporária informada pelo professor e troque no primeiro acesso.",
    link: "/entrar",
  });

  if (classId) revalidatePath(`/turmas/${classId}/alunos`);
  return {
    ok: true,
    resultado: [
      { displayName: "Senha redefinida", status: "criado", tempPassword: res.tempPassword },
    ],
  };
}

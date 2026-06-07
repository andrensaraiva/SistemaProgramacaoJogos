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

async function requireMaster() {
  const profile = await requireAdmin();
  if (!profile.is_master) {
    throw new Error("Apenas o administrador master pode gerenciar administradores.");
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
// Criar coordenador (gestão de qualquer turma). Mesmo fluxo do professor:
// senha temporária + 1º acesso. Qualquer admin pode criar.
// -----------------------------------------------------------------------------

export async function criarCoordenador(
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
    role: "coordenador",
    institutionalEmail: institutional,
    personalEmail: personal,
    createdBy: admin.id,
  });
  if (!res.ok) return { ok: false, message: res.error };

  revalidatePath("/admin");
  return {
    ok: true,
    message: `Coordenador criado. Senha temporária: ${res.tempPassword}`,
    tempPassword: res.tempPassword,
  };
}

export type CoordenadorRow = {
  id: string;
  display_name: string;
  institutional_email: string | null;
  personal_email: string | null;
  disabled_at: string | null;
};

export async function listarCoordenadores(): Promise<CoordenadorRow[]> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, display_name, institutional_email, personal_email, disabled_at")
    .eq("role", "coordenador")
    .order("display_name");
  return (data ?? []) as CoordenadorRow[];
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

// -----------------------------------------------------------------------------
// Editar professor (nome + emails)
// -----------------------------------------------------------------------------

const EditarProfessorSchema = z
  .object({
    professor_id: z.string().uuid(),
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

export async function editarProfessor(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const parsed = EditarProfessorSchema.safeParse({
    professor_id: formData.get("professor_id"),
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

  const admin = createAdminClient();
  // Mantém o email canônico do Auth alinhado ao institucional (ou pessoal).
  const canonical = institutional ?? personal;
  if (canonical) {
    await admin.auth.admin.updateUserById(parsed.data.professor_id, { email: canonical });
  }
  const { error } = await admin
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      institutional_email: institutional,
      personal_email: personal,
    })
    .eq("id", parsed.data.professor_id);

  if (error) {
    if (error.code === "23505") return { ok: false, message: "Um dos e-mails já está em uso." };
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin");
  return { ok: true, message: "Professor atualizado." };
}

// -----------------------------------------------------------------------------
// Suspender / reativar conta
// -----------------------------------------------------------------------------

export async function suspenderUsuario(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const me = await requireAdmin();
  const targetId = String(formData.get("user_id") ?? "");
  if (!targetId) return { ok: false, message: "Usuário não informado." };
  if (targetId === me.id) {
    return { ok: false, message: "Você não pode suspender a própria conta." };
  }

  const admin = createAdminClient();

  // Só o master mexe em outro admin.
  const { data: alvo } = await admin
    .from("profiles")
    .select("role")
    .eq("id", targetId)
    .single();
  if (alvo?.role === "admin") {
    if (!me.is_master) {
      return { ok: false, message: "Apenas o master pode suspender outro administrador." };
    }
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .is("disabled_at", null);
    if ((count ?? 0) <= 1) {
      return { ok: false, message: "Não é possível suspender o último admin ativo." };
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({ disabled_at: new Date().toISOString() })
    .eq("id", targetId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin");
  return { ok: true, message: "Conta suspensa." };
}

export async function reativarUsuario(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const targetId = String(formData.get("user_id") ?? "");
  if (!targetId) return { ok: false, message: "Usuário não informado." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ disabled_at: null })
    .eq("id", targetId);
  if (error) return { ok: false, message: error.message };

  await admin.from("notifications").insert({
    recipient_id: targetId,
    type: "conta_reativada",
    title: "Sua conta foi reativada",
    body: "Você já pode entrar normalmente.",
    link: "/entrar",
  });

  revalidatePath("/admin");
  return { ok: true, message: "Conta reativada." };
}

// -----------------------------------------------------------------------------
// Criar outro admin
// -----------------------------------------------------------------------------

export async function criarAdmin(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  let me;
  try {
    me = await requireMaster();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sem permissão." };
  }

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
    role: "admin",
    institutionalEmail: institutional,
    personalEmail: personal,
    createdBy: me.id,
  });
  if (!res.ok) return { ok: false, message: res.error };

  // Master opcional na criação.
  if (formData.get("is_master") === "on") {
    await createAdminClient().from("profiles").update({ is_master: true }).eq("id", res.userId);
  }

  revalidatePath("/admin");
  return {
    ok: true,
    message: `Admin criado. Senha temporária: ${res.tempPassword}`,
    tempPassword: res.tempPassword,
  };
}

// -----------------------------------------------------------------------------
// Promover / rebaixar admin (só master). Não pode rebaixar o último master.
// -----------------------------------------------------------------------------

export async function definirNivelAdmin(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  let me;
  try {
    me = await requireMaster();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sem permissão." };
  }
  const targetId = String(formData.get("admin_id") ?? "");
  const tornarMaster = formData.get("is_master") === "true";
  if (!targetId) return { ok: false, message: "Admin não informado." };

  const admin = createAdminClient();
  const { data: alvo } = await admin.from("profiles").select("role, is_master").eq("id", targetId).single();
  if (!alvo || alvo.role !== "admin") return { ok: false, message: "Alvo não é um admin." };

  // Não deixar a instituição sem nenhum master.
  if (!tornarMaster) {
    if (targetId === me.id) return { ok: false, message: "Você não pode rebaixar a si mesmo." };
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("is_master", true);
    if ((count ?? 0) <= 1) return { ok: false, message: "Não é possível rebaixar o último master." };
  }

  const { error } = await admin.from("profiles").update({ is_master: tornarMaster }).eq("id", targetId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin");
  return { ok: true, message: tornarMaster ? "Promovido a master." : "Rebaixado a admin normal." };
}

export type AdminRow = {
  id: string;
  display_name: string;
  institutional_email: string | null;
  is_master: boolean;
  disabled_at: string | null;
};

/** Lista os admins (para a seção do master). */
export async function listarAdmins(): Promise<AdminRow[]> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, display_name, institutional_email, is_master, disabled_at")
    .eq("role", "admin")
    .order("display_name");
  return (data ?? []) as AdminRow[];
}

/** Reset direto de uma conta (professor ou aluno), iniciado pelo admin. */
export async function resetarSenhaUsuario(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const targetId =
    String(formData.get("user_id") ?? "") || String(formData.get("professor_id") ?? "");
  if (!targetId) return { ok: false, message: "Usuário não informado." };

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
  return {
    ok: true,
    message: `Senha redefinida. Senha temporária: ${res.tempPassword}`,
    tempPassword: res.tempPassword,
  };
}

// -----------------------------------------------------------------------------
// Listar alunos da instituição (com busca) — para a seção de alunos do admin
// -----------------------------------------------------------------------------

export type AlunoInstitucional = {
  id: string;
  display_name: string;
  institutional_email: string | null;
  personal_email: string | null;
  profile_completed: boolean;
  disabled_at: string | null;
};

export async function listarAlunos(busca = "", limit = 50): Promise<AlunoInstitucional[]> {
  await requireAdmin();
  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select("id, display_name, institutional_email, personal_email, profile_completed, disabled_at")
    .eq("role", "aluno")
    .order("display_name")
    .limit(limit);

  const termo = busca.trim();
  if (termo) {
    query = query.or(
      `display_name.ilike.%${termo}%,institutional_email.ilike.%${termo}%,personal_email.ilike.%${termo}%`,
    );
  }

  const { data } = await query;
  return (data ?? []) as AlunoInstitucional[];
}

// -----------------------------------------------------------------------------
// Listar TODAS as turmas (service-role) — o admin não é dono/membro, então uma
// leitura comum sob RLS retornaria vazio. Uso administrativo (relatórios).
// -----------------------------------------------------------------------------

export type TurmaAdmin = {
  id: string;
  name: string;
  owner: { display_name: string } | null;
};

export async function listarTurmas(): Promise<TurmaAdmin[]> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("classes")
    .select("id, name, owner:profiles!owner_id(display_name)")
    .order("name");
  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    owner: (t.owner as unknown as { display_name: string } | null) ?? null,
  }));
}

// -----------------------------------------------------------------------------
// Configurações institucionais (nome + limiares de aprovação/frequência)
// -----------------------------------------------------------------------------

const ConfigSchema = z.object({
  institution_name: z.string().trim().min(2, { error: "Nome obrigatório" }),
  nota_aprovacao: z.coerce.number().min(0).max(10),
  nota_recuperacao_min: z.coerce.number().min(0).max(10),
  frequencia_minima_pct: z.coerce.number().int().min(0).max(100),
  // Sufixo da senha inicial derivada (ex.: "@2026"). 2–12 chars.
  senha_sufixo: z.string().trim().min(2, { error: "Mínimo 2 caracteres" }).max(12),
});

export async function salvarConfiguracoes(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const me = await requireAdmin();

  const parsed = ConfigSchema.safeParse({
    institution_name: formData.get("institution_name"),
    nota_aprovacao: formData.get("nota_aprovacao"),
    nota_recuperacao_min: formData.get("nota_recuperacao_min"),
    frequencia_minima_pct: formData.get("frequencia_minima_pct"),
    senha_sufixo: formData.get("senha_sufixo"),
  });
  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  }
  if (parsed.data.nota_recuperacao_min > parsed.data.nota_aprovacao) {
    return { ok: false, message: "A nota de recuperação não pode ser maior que a de aprovação." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("institution_settings").upsert(
    {
      id: true,
      institution_name: parsed.data.institution_name,
      nota_aprovacao: parsed.data.nota_aprovacao,
      nota_recuperacao_min: parsed.data.nota_recuperacao_min,
      frequencia_minima_pct: parsed.data.frequencia_minima_pct,
      senha_sufixo: parsed.data.senha_sufixo,
      tool_pixel_art: formData.get("tool_pixel_art") === "on",
      tool_vetor: formData.get("tool_vetor") === "on",
      tool_arte_digital: formData.get("tool_arte_digital") === "on",
      tool_blocos: formData.get("tool_blocos") === "on",
      updated_at: new Date().toISOString(),
      updated_by: me.id,
    },
    { onConflict: "id" },
  );
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/relatorios");
  return { ok: true, message: "Configurações salvas." };
}

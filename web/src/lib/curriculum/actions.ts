"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isProfessor, verifySession } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

// -----------------------------------------------------------------------------
// Server actions da camada curricular: gravar o rascunho do PPC (revisado),
// criar/clonar planos de ensino, salvar blocos e vincular UCs às turmas.
//
// Usa o admin client e VERIFICA posse no código (mesmo padrão de
// exercicios/gerar/actions.ts), já que grava árvores aninhadas.
// -----------------------------------------------------------------------------

type ActionResult = { ok: true } | { ok: false; message: string };

// O rascunho vem do front depois de revisado; tipamos de forma leve aqui.
type KnowledgeDraft = { text: string; children?: string[] };
type CapabilityDraft = { code?: string; description: string; kind?: string };
type UnitDraft = {
  title: string;
  carga_horaria_h?: number | null;
  objetivo_geral?: string;
  capabilities?: CapabilityDraft[];
  knowledge?: KnowledgeDraft[];
  bibliography?: { reference: string; tipo?: string }[];
};
type ModuleDraft = { name: string; units: UnitDraft[] };
export type CourseDraft = {
  name: string;
  eixo?: string;
  carga_horaria_total?: number | null;
  modules: ModuleDraft[];
};

async function requireProfessor() {
  const { user } = await verifySession();
  if (!(await isProfessor())) {
    throw new Error("Apenas professores podem realizar esta ação.");
  }
  return user;
}

/** Grava o curso inteiro (curso → módulos → UCs → habilidades/conhecimentos/bibliografia). */
export async function criarCursoFromDraft(draft: CourseDraft): Promise<ActionResult> {
  let user;
  try {
    user = await requireProfessor();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sem permissão." };
  }

  if (!draft?.name || !draft.modules?.length) {
    return { ok: false, message: "O rascunho do curso está vazio." };
  }

  const admin = createAdminClient();
  let courseId: string;

  try {
    const { data: course, error } = await admin
      .from("courses")
      .insert({
        author_id: user.id,
        name: draft.name,
        eixo: draft.eixo || null,
        carga_horaria_total: draft.carga_horaria_total ?? null,
        is_public: true,
      })
      .select("id")
      .single();
    if (error || !course) throw new Error(error?.message ?? "Falha ao criar curso");
    courseId = course.id;

    for (const [mIdx, mod] of draft.modules.entries()) {
      const { data: moduleRow, error: mErr } = await admin
        .from("course_modules")
        .insert({ course_id: courseId, name: mod.name, ord: mIdx })
        .select("id")
        .single();
      if (mErr || !moduleRow) throw new Error(mErr?.message ?? "Falha ao criar módulo");

      for (const [uIdx, unit] of (mod.units ?? []).entries()) {
        const { data: ucRow, error: uErr } = await admin
          .from("curricular_units")
          .insert({
            module_id: moduleRow.id,
            title: unit.title,
            carga_horaria_h: unit.carga_horaria_h ?? null,
            objetivo_geral: unit.objetivo_geral || null,
            ord: uIdx,
          })
          .select("id")
          .single();
        if (uErr || !ucRow) throw new Error(uErr?.message ?? "Falha ao criar UC");

        const caps = (unit.capabilities ?? []).map((c, i) => ({
          uc_id: ucRow.id,
          code: c.code || null,
          description: c.description,
          kind:
            c.kind === "socioemocional" || c.kind === "basica" ? c.kind : "tecnica",
          ord: i,
        }));
        if (caps.length) await admin.from("uc_capabilities").insert(caps);

        // Conhecimentos: insere pais e depois filhos (árvore de 2 níveis do rascunho).
        for (const [kIdx, k] of (unit.knowledge ?? []).entries()) {
          const { data: parent } = await admin
            .from("uc_knowledge")
            .insert({ uc_id: ucRow.id, text: k.text, ord: kIdx })
            .select("id")
            .single();
          const children = (k.children ?? []).map((text, ci) => ({
            uc_id: ucRow.id,
            parent_id: parent?.id ?? null,
            text,
            ord: ci,
          }));
          if (children.length) await admin.from("uc_knowledge").insert(children);
        }

        const bib = (unit.bibliography ?? []).map((b, i) => ({
          uc_id: ucRow.id,
          reference: b.reference,
          tipo: b.tipo === "complementar" ? "complementar" : "basica",
          ord: i,
        }));
        if (bib.length) await admin.from("uc_bibliography").insert(bib);
      }
    }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Falha ao salvar o curso.",
    };
  }

  revalidatePath("/cursos");
  redirect(`/cursos/${courseId}`);
}

export async function excluirCurso(formData: FormData): Promise<void> {
  const user = await requireProfessor();
  const id = formData.get("id") as string;
  const admin = createAdminClient();
  // Só o autor exclui.
  await admin.from("courses").delete().eq("id", id).eq("author_id", user.id);
  revalidatePath("/cursos");
  redirect("/cursos");
}

/** Cria um plano de ensino vazio do professor atual para uma UC. */
export async function criarPlanoDeEnsino(
  ucId: string,
  title: string,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireProfessor();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sem permissão." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("teaching_plans")
    .insert({ uc_id: ucId, owner_id: user.id, title: title || "Meu plano de ensino" })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, message: "Não foi possível criar o plano." };
  }
  revalidatePath(`/cursos`);
  redirect(`/planos/${data.id}`);
}

/** Clona o plano de outro professor (com blocos) para o professor atual. */
export async function clonarPlanoDeEnsino(sourcePlanId: string): Promise<ActionResult> {
  let user;
  try {
    user = await requireProfessor();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sem permissão." };
  }

  const admin = createAdminClient();

  const { data: source, error: srcErr } = await admin
    .from("teaching_plans")
    .select("id, uc_id, title")
    .eq("id", sourcePlanId)
    .single();
  if (srcErr || !source) {
    return { ok: false, message: "Plano original não encontrado." };
  }

  const { data: clone, error: cloneErr } = await admin
    .from("teaching_plans")
    .insert({
      uc_id: source.uc_id,
      owner_id: user.id,
      title: `${source.title} (cópia)`,
      cloned_from: source.id,
    })
    .select("id")
    .single();
  if (cloneErr || !clone) {
    return { ok: false, message: "Não foi possível clonar o plano." };
  }

  const { data: blocks } = await admin
    .from("teaching_plan_blocks")
    .select("title, aula_inicio, aula_fim, conteudo, apresentacao_url, atividade, criterios, ord")
    .eq("plan_id", source.id)
    .order("ord");

  if (blocks?.length) {
    await admin
      .from("teaching_plan_blocks")
      .insert(blocks.map((b) => ({ ...b, plan_id: clone.id })));
  }

  redirect(`/planos/${clone.id}`);
}

/** Cria ou atualiza um bloco/aula de um plano (só o dono do plano). */
export async function salvarBloco(
  planId: string,
  formData: FormData,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireProfessor();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sem permissão." };
  }

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("teaching_plans")
    .select("id, owner_id")
    .eq("id", planId)
    .single();
  if (!plan || plan.owner_id !== user.id) {
    return { ok: false, message: "Você não pode editar este plano." };
  }

  const blockId = (formData.get("block_id") as string) || null;
  const num = (v: FormDataEntryValue | null) => {
    const n = Number(v);
    return v != null && v !== "" && Number.isFinite(n) ? Math.trunc(n) : null;
  };
  const payload = {
    plan_id: planId,
    title: (formData.get("title") as string) || "Novo bloco",
    aula_inicio: num(formData.get("aula_inicio")),
    aula_fim: num(formData.get("aula_fim")),
    conteudo: (formData.get("conteudo") as string) || null,
    apresentacao_url: (formData.get("apresentacao_url") as string) || null,
    atividade: (formData.get("atividade") as string) || null,
    criterios: (formData.get("criterios") as string) || null,
  };

  if (blockId) {
    await admin.from("teaching_plan_blocks").update(payload).eq("id", blockId);
  } else {
    const { count } = await admin
      .from("teaching_plan_blocks")
      .select("*", { count: "exact", head: true })
      .eq("plan_id", planId);
    await admin
      .from("teaching_plan_blocks")
      .insert({ ...payload, ord: count ?? 0 });
  }

  revalidatePath(`/planos/${planId}`);
  return { ok: true };
}

export async function excluirBloco(formData: FormData): Promise<void> {
  const user = await requireProfessor();
  const blockId = formData.get("block_id") as string;
  const planId = formData.get("plan_id") as string;
  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("teaching_plans")
    .select("owner_id")
    .eq("id", planId)
    .single();
  if (plan?.owner_id === user.id) {
    await admin.from("teaching_plan_blocks").delete().eq("id", blockId);
  }
  revalidatePath(`/planos/${planId}`);
}

/** Vincula uma UC (e plano escolhido) a uma turma do professor. */
export async function vincularUcNaTurma(
  classId: string,
  formData: FormData,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireProfessor();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Sem permissão." };
  }

  const admin = createAdminClient();
  const { data: turma } = await admin
    .from("classes")
    .select("owner_id")
    .eq("id", classId)
    .single();
  if (!turma || turma.owner_id !== user.id) {
    return { ok: false, message: "Você não é dono desta turma." };
  }

  const ucId = formData.get("uc_id") as string;
  const planId = (formData.get("teaching_plan_id") as string) || null;
  const serie = (formData.get("serie") as string) || null;
  if (!ucId) return { ok: false, message: "Selecione uma UC." };

  const { error } = await admin.from("class_units").upsert(
    {
      class_id: classId,
      uc_id: ucId,
      teaching_plan_id: planId,
      serie,
    },
    { onConflict: "class_id,uc_id" },
  );
  if (error) {
    return { ok: false, message: `Não foi possível vincular: ${error.message}` };
  }

  revalidatePath(`/turmas/${classId}/ucs`);
  return { ok: true };
}

export async function desvincularUcDaTurma(formData: FormData): Promise<void> {
  const user = await requireProfessor();
  const classUnitId = formData.get("class_unit_id") as string;
  const classId = formData.get("class_id") as string;
  const admin = createAdminClient();
  const { data: turma } = await admin
    .from("classes")
    .select("owner_id")
    .eq("id", classId)
    .single();
  if (turma?.owner_id === user.id) {
    await admin.from("class_units").delete().eq("id", classUnitId);
  }
  revalidatePath(`/turmas/${classId}/ucs`);
}

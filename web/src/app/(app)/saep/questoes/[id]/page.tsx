import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { requireCapability } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

import { QuestaoEditor } from "../_editor";

async function loadMatrixOptions(userId: string) {
  const admin = createAdminClient();
  const { data: courses } = await admin.from("courses").select("id").eq("author_id", userId);
  const courseIds = (courses ?? []).map((c) => c.id);
  if (!courseIds.length) return { competencies: [], knowledgeObjects: [] };
  const { data: matrices } = await admin
    .from("competency_matrices")
    .select("id")
    .in("course_id", courseIds);
  const matrixIds = (matrices ?? []).map((m) => m.id);
  if (!matrixIds.length) return { competencies: [], knowledgeObjects: [] };
  const [{ data: comps }, { data: objs }] = await Promise.all([
    admin.from("competencies").select("id, code, description").in("matrix_id", matrixIds).order("ord"),
    admin.from("knowledge_objects").select("id, code, name").in("matrix_id", matrixIds).order("ord"),
  ]);
  return { competencies: comps ?? [], knowledgeObjects: objs ?? [] };
}

export default async function EditarQuestaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireCapability("gerenciar_curso");

  const admin = createAdminClient();
  const { data: q } = await admin
    .from("quiz_questions")
    .select(
      "id, author_id, course_id, competency_id, knowledge_object_id, contexto, comando, resolucao, difficulty, is_public",
    )
    .eq("id", id)
    .single();
  if (!q) notFound();
  if (q.author_id !== profile.id) redirect("/saep/questoes");

  const { data: opts } = await admin
    .from("quiz_options")
    .select("label, text, is_correct, justification, ord")
    .eq("question_id", id)
    .order("ord");

  const { competencies, knowledgeObjects } = await loadMatrixOptions(profile.id);

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[
          { label: "SAEP", href: "/saep/questoes" },
          { label: "Banco de questões", href: "/saep/questoes" },
          { label: "Editar questão" },
        ]}
      />
      <h1 className="mb-4 mt-2 text-2xl font-bold">Editar questão</h1>
      <QuestaoEditor
        competencies={competencies}
        knowledgeObjects={knowledgeObjects}
        initial={{
          id: q.id,
          course_id: q.course_id ?? "",
          competency_id: q.competency_id ?? "",
          knowledge_object_id: q.knowledge_object_id ?? "",
          contexto: q.contexto,
          comando: q.comando,
          resolucao: q.resolucao ?? "",
          difficulty: q.difficulty,
          is_public: q.is_public,
          options: (opts ?? []).map((o) => ({
            label: o.label,
            text: o.text,
            is_correct: o.is_correct,
            justification: o.justification ?? "",
          })),
        }}
      />
    </div>
  );
}

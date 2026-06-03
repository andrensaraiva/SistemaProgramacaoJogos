import { redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { getProfile } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

import { QuestaoEditor } from "../_editor";

// Carrega capacidades/objetos das matrizes dos cursos do professor (para classificar).
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

export default async function NovaQuestaoPage() {
  const profile = await getProfile();
  const isProf = profile?.role === "professor" || profile?.role === "admin";
  if (!profile) redirect("/entrar");
  if (!isProf) redirect("/painel");

  const { competencies, knowledgeObjects } = await loadMatrixOptions(profile.id);

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[
          { label: "SAEP", href: "/saep/questoes" },
          { label: "Banco de questões", href: "/saep/questoes" },
          { label: "Nova questão" },
        ]}
      />
      <h1 className="mb-4 mt-2 text-2xl font-bold">Nova questão</h1>
      <QuestaoEditor competencies={competencies} knowledgeObjects={knowledgeObjects} />
    </div>
  );
}

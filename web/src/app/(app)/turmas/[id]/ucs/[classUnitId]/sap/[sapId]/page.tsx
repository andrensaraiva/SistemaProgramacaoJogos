import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { getProfile } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { SapManager } from "./_manager";
import { SapAluno } from "./_aluno";

// A rota usa o assignment_id como [sapId] (igual aos simulados/projetos). O
// registro sap_assessments é resolvido/criado pelo professor na 1ª visita.
type Params = Promise<{ id: string; classUnitId: string; sapId: string }>;

type RubricUnit = {
  id: string;
  code: string | null;
  title: string;
  elements: {
    id: string;
    code: string | null;
    title: string;
    criteria: {
      id: string;
      code: string | null;
      description: string;
      items: {
        id: string;
        code: string | null;
        description: string;
        points: number;
        competency_id: string | null;
        knowledge_object_id: string | null;
      }[];
    }[];
  }[];
};

async function loadRubric(admin: ReturnType<typeof createAdminClient>, assessmentId: string): Promise<RubricUnit[]> {
  const { data: units } = await admin
    .from("sap_units")
    .select("id, code, title, ord")
    .eq("assessment_id", assessmentId)
    .order("ord");
  if (!units?.length) return [];

  const unitIds = units.map((u) => u.id);
  const { data: elements } = await admin
    .from("sap_elements")
    .select("id, unit_id, code, title, ord")
    .in("unit_id", unitIds)
    .order("ord");
  const elementIds = (elements ?? []).map((e) => e.id);
  const { data: criteria } = elementIds.length
    ? await admin
        .from("sap_criteria")
        .select("id, element_id, code, description, ord")
        .in("element_id", elementIds)
        .order("ord")
    : { data: [] };
  const criterionIds = (criteria ?? []).map((c) => c.id);
  const { data: items } = criterionIds.length
    ? await admin
        .from("sap_items")
        .select("id, criterion_id, code, description, points, competency_id, knowledge_object_id, ord")
        .in("criterion_id", criterionIds)
        .order("ord")
    : { data: [] };

  return units.map((u) => ({
    id: u.id,
    code: u.code,
    title: u.title,
    elements: (elements ?? [])
      .filter((e) => e.unit_id === u.id)
      .map((e) => ({
        id: e.id,
        code: e.code,
        title: e.title,
        criteria: (criteria ?? [])
          .filter((c) => c.element_id === e.id)
          .map((c) => ({
            id: c.id,
            code: c.code,
            description: c.description,
            items: (items ?? [])
              .filter((it) => it.criterion_id === c.id)
              .map((it) => ({
                id: it.id,
                code: it.code,
                description: it.description,
                points: Number(it.points),
                competency_id: it.competency_id,
                knowledge_object_id: it.knowledge_object_id,
              })),
          })),
      })),
  }));
}

export default async function SapPage({ params }: { params: Params }) {
  const { id, classUnitId, sapId: assignmentId } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const supabase = await createClient();
  const { data: cu } = await supabase
    .from("class_units")
    .select("id, class_id, class:classes!class_id(id, name, owner_id), uc:curricular_units!uc_id(id, title)")
    .eq("id", classUnitId)
    .single();
  if (!cu || cu.class_id !== id) notFound();
  const cls = cu.class as unknown as { id: string; name: string; owner_id: string };
  const uc = cu.uc as unknown as { id: string; title: string } | null;
  const isOwner = cls.owner_id === profile.id;

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, kind, class_unit_id")
    .eq("id", assignmentId)
    .single();
  if (!assignment || assignment.kind !== "sap_pratico" || assignment.class_unit_id !== classUnitId)
    notFound();

  const admin = createAdminClient();
  const { data: sap } = await admin
    .from("sap_assessments")
    .select("id, title, description, max_score")
    .eq("assignment_id", assignmentId)
    .maybeSingle();

  const crumbs = [
    { label: "Turmas", href: "/turmas" },
    { label: cls.name, href: `/turmas/${id}` },
    { label: "Unidades curriculares", href: `/turmas/${id}/ucs` },
    { label: uc?.title ?? "UC", href: `/turmas/${id}/ucs/${classUnitId}/atividades` },
    { label: assignment.title },
  ];

  const rubric = sap ? await loadRubric(admin, sap.id) : [];

  // ---- PROFESSOR ----
  if (isOwner) {
    // Competências/objetos das matrizes dos cursos do professor (classificar itens).
    const { data: courses } = await admin.from("courses").select("id").eq("author_id", profile.id);
    const courseIds = (courses ?? []).map((c) => c.id);
    const { data: matrices } = courseIds.length
      ? await admin.from("competency_matrices").select("id").in("course_id", courseIds)
      : { data: [] };
    const matrixIds = (matrices ?? []).map((m) => m.id);
    const [{ data: comps }, { data: objs }] = matrixIds.length
      ? await Promise.all([
          admin.from("competencies").select("id, code, description").in("matrix_id", matrixIds).order("ord"),
          admin.from("knowledge_objects").select("id, code, name").in("matrix_id", matrixIds).order("ord"),
        ])
      : [{ data: [] }, { data: [] }];

    // Alunos da turma + suas avaliações/entregas.
    const { data: membros } = await admin
      .from("class_members")
      .select("student:profiles!student_id(id, display_name)")
      .eq("class_id", id)
      .order("joined_at");
    const students = (membros ?? []).map((m) => m.student as unknown as { id: string; display_name: string });

    const { data: evals } = sap
      ? await admin
          .from("sap_evaluations")
          .select("id, student_id, submission_link, submitted_at, score, max_score, evaluated_at")
          .eq("assessment_id", sap.id)
      : { data: [] };
    const evalByStudent = new Map(
      (evals ?? []).map((e) => [e.student_id, e]),
    );

    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={crumbs} />
        <SapManager
          classId={id}
          classUnitId={classUnitId}
          assignmentId={assignmentId}
          assignmentTitle={assignment.title}
          sap={sap ? { id: sap.id, title: sap.title, description: sap.description ?? "", max_score: sap.max_score } : null}
          rubric={rubric}
          competencies={comps ?? []}
          knowledgeObjects={objs ?? []}
          students={students.map((s) => {
            const ev = evalByStudent.get(s.id);
            return {
              id: s.id,
              name: s.display_name,
              link: ev?.submission_link ?? null,
              submittedAt: ev?.submitted_at ?? null,
              score: ev?.score != null ? Number(ev.score) : null,
              maxScore: ev?.max_score != null ? Number(ev.max_score) : null,
              evaluated: Boolean(ev?.evaluated_at),
            };
          })}
        />
      </div>
    );
  }

  // ---- ALUNO ----
  if (!sap) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={crumbs} />
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          O professor ainda não publicou este SAP.
        </div>
      </div>
    );
  }

  const { data: membership } = await supabase
    .from("class_members")
    .select("student_id")
    .eq("class_id", id)
    .eq("student_id", profile.id)
    .maybeSingle();
  if (!membership) redirect(`/turmas/${id}`);

  const { data: myEval } = await admin
    .from("sap_evaluations")
    .select("id, submission_link, submitted_at, score, max_score, feedback, evaluated_at")
    .eq("assessment_id", sap.id)
    .eq("student_id", profile.id)
    .maybeSingle();

  // Marcações (só se já avaliado) para mostrar o resultado por item.
  let marks: Record<string, { met: boolean; justification: string | null }> = {};
  if (myEval?.evaluated_at) {
    const { data: mk } = await admin
      .from("sap_item_marks")
      .select("item_id, met, justification")
      .eq("evaluation_id", myEval.id);
    marks = Object.fromEntries((mk ?? []).map((m) => [m.item_id, { met: m.met, justification: m.justification }]));
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={crumbs} />
      <SapAluno
        assessmentId={sap.id}
        title={sap.title}
        description={sap.description}
        ucTitle={uc?.title ?? "UC"}
        rubric={rubric}
        myLink={myEval?.submission_link ?? null}
        submittedAt={myEval?.submitted_at ?? null}
        evaluated={Boolean(myEval?.evaluated_at)}
        score={myEval?.score != null ? Number(myEval.score) : null}
        maxScore={myEval?.max_score != null ? Number(myEval.max_score) : null}
        feedback={myEval?.feedback ?? null}
        marks={marks}
      />
    </div>
  );
}

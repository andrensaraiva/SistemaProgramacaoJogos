import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/dal";
import { getAcessoTurma } from "@/lib/turmas/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { SimuladoManager } from "./_manager";
import { ResponderSimulado } from "./_responder";

// A rota usa o assignment_id como [simuladoId] (igual aos projetos). O registro
// quiz_simulados é resolvido/criado pelo professor na primeira visita.
type Params = Promise<{ id: string; classUnitId: string; simuladoId: string }>;

export default async function SimuladoPage({ params }: { params: Params }) {
  const { id, classUnitId, simuladoId: assignmentId } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const supabase = await createClient();
  const { data: cu } = await supabase
    .from("class_units")
    .select(
      "id, class_id, class:classes!class_id(id, name, owner_id), uc:curricular_units!uc_id(id, title)",
    )
    .eq("id", classUnitId)
    .single();
  if (!cu || cu.class_id !== id) notFound();
  const cls = cu.class as unknown as { id: string; name: string; owner_id: string };
  const uc = cu.uc as unknown as { id: string; title: string } | null;
  const isOwner = (await getAcessoTurma(id, profile, cls.owner_id)).podeGerenciar;

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, kind, class_unit_id")
    .eq("id", assignmentId)
    .single();
  if (!assignment || assignment.kind !== "saep_simulado" || assignment.class_unit_id !== classUnitId)
    notFound();

  const admin = createAdminClient();
  const { data: simulado } = await admin
    .from("quiz_simulados")
    .select("id, title, description, time_limit_min, show_feedback")
    .eq("assignment_id", assignmentId)
    .maybeSingle();

  const crumbs = [
    { label: "Turmas", href: "/turmas" },
    { label: cls.name, href: `/turmas/${id}` },
    { label: "Unidades curriculares", href: `/turmas/${id}/ucs` },
    { label: uc?.title ?? "UC", href: `/turmas/${id}/ucs/${classUnitId}/atividades` },
    { label: assignment.title },
  ];

  // ---- PROFESSOR: monta e configura o simulado ----
  if (isOwner) {
    // Banco de questões do professor (suas + públicas) para selecionar.
    const { data: bank } = await admin
      .from("quiz_questions")
      .select(
        "id, comando, difficulty, competency:competencies!competency_id(code), knowledge_object:knowledge_objects!knowledge_object_id(code)",
      )
      .or(`author_id.eq.${profile.id},is_public.eq.true`)
      .order("created_at", { ascending: false });

    // Questões já no simulado (se já existe).
    let selectedIds: string[] = [];
    if (simulado) {
      const { data: chosen } = await admin
        .from("quiz_simulado_questions")
        .select("question_id, ord")
        .eq("simulado_id", simulado.id)
        .order("ord");
      selectedIds = (chosen ?? []).map((c) => c.question_id);
    }

    // Quantos alunos já enviaram (resumo rápido).
    let submitted = 0;
    if (simulado) {
      const { count } = await admin
        .from("quiz_attempts")
        .select("id", { count: "exact", head: true })
        .eq("simulado_id", simulado.id)
        .not("submitted_at", "is", null);
      submitted = count ?? 0;
    }

    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={crumbs} />
        <div>
          <Link href={`/turmas/${id}/ucs/${classUnitId}/saep`}>
            <Button variant="secondary">Ver dashboard SAEP da UC</Button>
          </Link>
        </div>
        <SimuladoManager
          assignmentId={assignmentId}
          assignmentTitle={assignment.title}
          simulado={
            simulado
              ? {
                  id: simulado.id,
                  title: simulado.title,
                  description: simulado.description ?? "",
                  time_limit_min: simulado.time_limit_min,
                  show_feedback: simulado.show_feedback,
                }
              : null
          }
          bank={(bank ?? []).map((q) => ({
            id: q.id,
            comando: q.comando,
            difficulty: q.difficulty,
            competency_code:
              (q.competency as unknown as { code: string } | null)?.code ?? null,
            object_code:
              (q.knowledge_object as unknown as { code: string } | null)?.code ?? null,
          }))}
          selectedIds={selectedIds}
          submittedCount={submitted}
        />
      </div>
    );
  }

  // ---- ALUNO: responde o simulado ----
  if (!simulado) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={crumbs} />
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          O professor ainda não publicou este simulado.
        </div>
      </div>
    );
  }

  // O aluno precisa ser membro da turma.
  const { data: membership } = await supabase
    .from("class_members")
    .select("student_id")
    .eq("class_id", id)
    .eq("student_id", profile.id)
    .maybeSingle();
  if (!membership) redirect(`/turmas/${id}`);

  // Tentativa do aluno (se houver).
  const { data: attempt } = await admin
    .from("quiz_attempts")
    .select("id, submitted_at, score, correct_count, total_questions")
    .eq("simulado_id", simulado.id)
    .eq("student_id", profile.id)
    .maybeSingle();

  // Questões do simulado (sem revelar correta/justificativa antes do envio).
  const { data: sq } = await admin
    .from("quiz_simulado_questions")
    .select(
      "ord, question:quiz_questions!question_id(id, contexto, comando, resolucao)",
    )
    .eq("simulado_id", simulado.id)
    .order("ord");

  const questionIds = (sq ?? []).map(
    (r) => (r.question as unknown as { id: string }).id,
  );
  const { data: options } = questionIds.length
    ? await admin
        .from("quiz_options")
        .select("id, question_id, label, text, is_correct, justification, ord")
        .in("question_id", questionIds)
        .order("ord")
    : { data: [] };

  const submitted = Boolean(attempt?.submitted_at);
  const showFeedback = simulado.show_feedback && submitted;

  // Respostas do aluno (para mostrar resultado após enviar).
  let myAnswers: Record<string, string | null> = {};
  if (attempt) {
    const { data: ans } = await admin
      .from("quiz_answers")
      .select("question_id, selected_option_id")
      .eq("attempt_id", attempt.id);
    myAnswers = Object.fromEntries(
      (ans ?? []).map((a) => [a.question_id, a.selected_option_id]),
    );
  }

  const questions = (sq ?? []).map((r) => {
    const q = r.question as unknown as {
      id: string;
      contexto: string;
      comando: string;
      resolucao: string | null;
    };
    const opts = (options ?? [])
      .filter((o) => o.question_id === q.id)
      .map((o) => ({
        id: o.id,
        label: o.label,
        text: o.text,
        // Só expõe correta/justificativa quando pode mostrar feedback.
        is_correct: showFeedback ? o.is_correct : undefined,
        justification: showFeedback ? o.justification ?? null : undefined,
      }));
    return {
      id: q.id,
      contexto: q.contexto,
      comando: q.comando,
      resolucao: showFeedback ? q.resolucao ?? null : null,
      options: opts,
      myOption: myAnswers[q.id] ?? null,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={crumbs} />
      <ResponderSimulado
        simuladoId={simulado.id}
        title={simulado.title}
        description={simulado.description}
        timeLimitMin={simulado.time_limit_min}
        ucTitle={uc?.title ?? "UC"}
        questions={questions}
        submitted={submitted}
        result={
          submitted && attempt
            ? {
                score: Number(attempt.score ?? 0),
                correct: attempt.correct_count,
                total: attempt.total_questions,
              }
            : null
        }
      />
    </div>
  );
}

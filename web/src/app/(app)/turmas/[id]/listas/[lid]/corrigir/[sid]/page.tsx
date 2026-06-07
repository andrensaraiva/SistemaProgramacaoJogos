import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { getProfile } from "@/lib/auth/dal";
import { getLanguage } from "@/lib/exercises/languages";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAcessoTurma } from "@/lib/turmas/access";

import { GradeForm } from "./_grade-form";

type Params = Promise<{ id: string; lid: string; sid: string }>;

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  aprovado: { text: "Aprovado", cls: "text-success" },
  reprovado: { text: "Reprovado", cls: "text-danger" },
  rodando: { text: "Rodando", cls: "text-warning" },
  erro: { text: "Erro", cls: "text-warning" },
};

export default async function CorrigirPage({ params }: { params: Params }) {
  const { id, lid, sid } = await params;
  const profile = await getProfile();
  if (!profile) notFound();
  // A autorização real (gerenciar a turma) é checada abaixo, após carregar a
  // submissão — cobre dono, co-docente, coordenador e admin.

  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("submissions")
    .select(
      "id, code, submission_link, response_text, submission_image_url, status, passed_count, total_count, created_at, manual_grade, manual_feedback, student_id, assignment_id, student:profiles!student_id(display_name), exercise:exercises!exercise_id(title, language, language_id, exercise_type), assignment:assignments!assignment_id(class_id, title, class:classes!class_id(owner_id, name))",
    )
    .eq("id", sid)
    .single();

  if (!sub) notFound();

  const assignment = sub.assignment as unknown as {
    class_id: string;
    title: string;
    class: { owner_id: string; name: string };
  };
  const exercise = sub.exercise as unknown as {
    title: string;
    language: string;
    language_id: string | null;
    exercise_type: string | null;
  };
  const student = sub.student as unknown as { display_name: string };

  // Posse: a submissão precisa ser da turma certa e da lista certa, E o usuário
  // precisa gerenciar a turma (dono, co-docente, coordenador ou admin).
  const { podeGerenciar } = await getAcessoTurma(
    assignment.class_id,
    profile,
    assignment.class.owner_id,
  );
  if (!podeGerenciar || assignment.class_id !== id || sub.assignment_id !== lid) {
    notFound();
  }

  // Arte entregue: gera URL assinada para visualizar (bucket privado).
  let artUrl: string | null = null;
  const imagePath = (sub as { submission_image_url?: string | null }).submission_image_url;
  if (imagePath) {
    const { data: signed } = await admin.storage
      .from("submissoes")
      .createSignedUrl(imagePath, 60 * 60);
    artUrl = signed?.signedUrl ?? null;
  }

  const langSlug = exercise.language_id ?? exercise.language;
  const lang = await getLanguage(langSlug);
  const status = STATUS_LABEL[sub.status] ?? {
    text: sub.status,
    cls: "text-muted-foreground",
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Turmas", href: "/turmas" },
            { label: assignment.class.name, href: `/turmas/${id}` },
            { label: assignment.title, href: `/turmas/${id}/listas/${lid}` },
            { label: `Corrigir · ${student.display_name}` },
          ]}
        />
        <h1 className="mt-1 text-2xl font-bold">
          Corrigir: {exercise.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {student.display_name}
          </span>
          <span>·</span>
          <span className={status.cls}>{status.text}</span>
          <span>·</span>
          <span>
            {sub.passed_count}/{sub.total_count} testes automáticos
          </span>
          <span>·</span>
          <span>{lang?.label ?? langSlug}</span>
          <span>·</span>
          <span>
            {new Date(sub.created_at).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {artUrl && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold">Arte entregue</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artUrl}
            alt={`Entrega de ${student.display_name}`}
            className="max-h-[480px] w-auto rounded-lg border border-border bg-white"
            style={{ imageRendering: exercise.exercise_type === "pixel_art" ? "pixelated" : "auto" }}
          />
        </div>
      )}

      <GradeForm
        classId={id}
        assignmentId={lid}
        submissionId={sub.id}
        exerciseType={exercise.exercise_type ?? "codigo"}
        code={sub.code}
        submissionLink={sub.submission_link}
        responseText={sub.response_text}
        monacoLanguage={lang?.monaco_language ?? langSlug}
        currentGrade={sub.manual_grade}
        currentFeedback={sub.manual_feedback}
      />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmForm } from "@/components/confirm-form";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { excluirLista } from "@/lib/turmas/actions";

type Params = Promise<{ id: string; lid: string }>;

const KIND_LABEL: Record<string, string> = {
  lista: "Lista",
  desafio: "Desafio",
  prova: "Prova",
};

const STATUS_ICON: Record<string, { icon: string; className: string }> = {
  aprovado: { icon: "✓", className: "text-green-600 font-bold" },
  reprovado: { icon: "✗", className: "text-red-500 font-bold" },
  rodando: { icon: "…", className: "text-yellow-500" },
  erro: { icon: "!", className: "text-orange-500" },
};

export default async function ListaProgressoPage({ params }: { params: Params }) {
  const { id, lid } = await params;
  const profile = await getProfile();
  const isProf =
    profile?.role === "professor" || profile?.role === "admin";

  const supabase = await createClient();

  const { data: lista } = await supabase
    .from("assignments")
    .select("id, title, kind, due_at, class_id, class:classes!class_id(id, name, owner_id)")
    .eq("id", lid)
    .eq("class_id", id)
    .single();

  if (!lista) notFound();

  const cls = lista.class as unknown as {
    id: string;
    name: string;
    owner_id: string;
  };

  const isOwner = cls.owner_id === profile?.id;

  // Exercises in this assignment
  const { data: assignmentExercises } = await supabase
    .from("assignment_exercises")
    .select("ord, exercise:exercises!exercise_id(id, title)")
    .eq("assignment_id", lid)
    .order("ord");

  const exercises = (assignmentExercises ?? []).map((ae) => {
    const ex = ae.exercise as unknown as { id: string; title: string };
    return { id: ex.id, title: ex.title, ord: ae.ord };
  });

  if (isOwner) {
    // Professor: full progress table
    const { data: membros } = await supabase
      .from("class_members")
      .select("student:profiles!student_id(id, display_name)")
      .eq("class_id", id)
      .order("joined_at");

    const students = (membros ?? []).map((m) => {
      const s = m.student as unknown as { id: string; display_name: string };
      return s;
    });

    // Latest submission per (student, exercise) for this assignment
    const { data: allSubs } = await supabase
      .from("submissions")
      .select("student_id, exercise_id, status, passed_count, total_count, created_at")
      .eq("assignment_id", lid)
      .order("created_at", { ascending: false });

    type SubRow = NonNullable<typeof allSubs>[number];

    // Build lookup: studentId → exerciseId → latestSubmission
    const submissionMap = new Map<string, Map<string, SubRow>>();
    for (const sub of allSubs ?? []) {
      if (!submissionMap.has(sub.student_id)) {
        submissionMap.set(sub.student_id, new Map());
      }
      const byEx = submissionMap.get(sub.student_id)!;
      if (!byEx.has(sub.exercise_id)) {
        byEx.set(sub.exercise_id, sub);
      }
    }

    const approvedCount = (studentId: string) => {
      const byEx = submissionMap.get(studentId);
      if (!byEx) return 0;
      let count = 0;
      for (const sub of byEx.values()) {
        if (sub.status === "aprovado") count++;
      }
      return count;
    };

    return (
      <div className="flex flex-col gap-6">
        <Header lista={lista} cls={cls} isOwner={isOwner} />

        {exercises.length === 0 && (
          <EmptyExercises isOwner={isOwner} />
        )}

        {exercises.length > 0 && students.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhum aluno na turma ainda.
          </div>
        )}

        {exercises.length > 0 && students.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium">Aluno</th>
                  {exercises.map((ex) => (
                    <th
                      key={ex.id}
                      className="px-3 py-3 text-center font-medium max-w-32"
                      title={ex.title}
                    >
                      <span className="block truncate max-w-28">{ex.title}</span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, i) => {
                  const byEx = submissionMap.get(student.id);
                  const approved = approvedCount(student.id);
                  return (
                    <tr
                      key={student.id}
                      className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}
                    >
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {student.display_name}
                      </td>
                      {exercises.map((ex) => {
                        const sub = byEx?.get(ex.id);
                        const style = sub
                          ? STATUS_ICON[sub.status] ?? { icon: "?", className: "text-muted-foreground" }
                          : { icon: "—", className: "text-muted-foreground" };
                        return (
                          <td
                            key={ex.id}
                            className="px-3 py-3 text-center"
                            title={
                              sub
                                ? `${sub.passed_count}/${sub.total_count} testes`
                                : "Não enviado"
                            }
                          >
                            <span className={style.className}>{style.icon}</span>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center font-semibold">
                        {approved}/{exercises.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Legend />
      </div>
    );
  }

  // Student view: own progress only
  const { data: mySubs } = await supabase
    .from("submissions")
    .select("exercise_id, status, passed_count, total_count, created_at")
    .eq("assignment_id", lid)
    .eq("student_id", profile!.id)
    .order("created_at", { ascending: false });

  type MySubRow = NonNullable<typeof mySubs>[number];
  const mySubMap = new Map<string, MySubRow>();
  for (const sub of mySubs ?? []) {
    if (!mySubMap.has(sub.exercise_id)) mySubMap.set(sub.exercise_id, sub);
  }

  const myApproved = [...mySubMap.values()].filter(
    (s) => s.status === "aprovado",
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <Header lista={lista} cls={cls} isOwner={false} />

      <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4">
        <div className="text-3xl font-bold text-primary">{myApproved}</div>
        <div className="text-sm text-muted-foreground">
          de {exercises.length} exercício{exercises.length !== 1 ? "s" : ""} aprovado{myApproved !== 1 ? "s" : ""}
        </div>
      </div>

      {exercises.length === 0 && <EmptyExercises isOwner={false} />}

      <div className="flex flex-col gap-2">
        {exercises.map((ex) => {
          const sub = mySubMap.get(ex.id);
          const style = sub
            ? STATUS_ICON[sub.status] ?? { icon: "?", className: "text-muted-foreground" }
            : { icon: "—", className: "text-muted-foreground" };
          return (
            <div
              key={ex.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
            >
              <span className="font-medium text-sm">{ex.title}</span>
              <div className="flex items-center gap-3">
                {sub && (
                  <span className="text-xs text-muted-foreground">
                    {sub.passed_count}/{sub.total_count} testes
                  </span>
                )}
                <span className={`text-base ${style.className}`}>
                  {style.icon}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Header({
  lista,
  cls,
  isOwner,
}: {
  lista: { id: string; title: string; kind: string; due_at: string | null; class_id: string };
  cls: { id: string; name: string };
  isOwner: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <Link
          href={`/turmas/${cls.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {cls.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{lista.title}</h1>
        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
            {KIND_LABEL[lista.kind] ?? lista.kind}
          </span>
          {lista.due_at && (
            <span>
              Prazo: {new Date(lista.due_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>

      {isOwner && (
        <ConfirmForm
          action={excluirLista}
          message="Excluir esta lista? As submissões dos alunos serão mantidas."
        >
          <input type="hidden" name="id" value={lista.id} />
          <input type="hidden" name="class_id" value={lista.class_id} />
          <Button type="submit" variant="danger">Excluir lista</Button>
        </ConfirmForm>
      )}
    </div>
  );
}

function EmptyExercises({ isOwner }: { isOwner: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
      {isOwner
        ? "Nenhum exercício nesta lista ainda. A adição de exercícios estará disponível na Fase 2."
        : "Nenhum exercício disponível ainda."}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      <span><span className="text-green-600 font-bold">✓</span> Aprovado</span>
      <span><span className="text-red-500 font-bold">✗</span> Reprovado</span>
      <span><span className="text-yellow-500">…</span> Rodando</span>
      <span><span className="text-orange-500">!</span> Erro</span>
      <span>— Não enviado</span>
    </div>
  );
}

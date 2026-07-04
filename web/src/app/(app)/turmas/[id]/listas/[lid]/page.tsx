import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ConfirmForm } from "@/components/confirm-form";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getProfile } from "@/lib/auth/dal";
import { getAcessoTurma } from "@/lib/turmas/access";
import { createClient } from "@/lib/supabase/server";
import { excluirLista } from "@/lib/turmas/actions";
import { CreativeSubmission } from "@/components/editores/CreativeSubmission";
import { isCodeKind, isCreativeKind } from "@/lib/activities/registry";
import { DEFAULT_CONFIG, type CreativeKind, type CreativeProject } from "@/lib/canvas/types";

import { MeuGrupoPanel } from "@/components/meu-grupo";
import { getMeuGrupo } from "@/lib/groups/queries";

import { AnexarExercicios } from "./_anexar";
import { EntregaForm } from "./_entrega";
import { ExamLockdown } from "./_exam-lockdown";

type Params = Promise<{ id: string; lid: string }>;

type ExerciseRow = {
  id: string;
  title: string;
  ord: number;
  exercise_type?: string;
  is_group?: boolean;
  response_template?: string | null;
  canvas_config?: { width: number; height: number; palette?: string[] } | null;
};
type StudentRow = { id: string; display_name: string };
type SubmissionRow = {
  id: string;
  student_id: string;
  exercise_id: string;
  status: string;
  passed_count: number;
  total_count: number;
  created_at: string;
  code: string;
  paste_event_count: number;
  time_to_solve_ms: number | null;
  keystroke_count: number;
  suspicion_score: number;
  suspicion_reasons: string[] | null;
  manual_grade: number | null;
};

type SimilarityAlert = {
  score: number;
  otherStudentId: string;
};

const KIND_LABEL: Record<string, string> = {
  lista: "Lista",
  desafio: "Desafio",
  prova: "Prova",
};

const STATUS_ICON: Record<string, { icon: string; className: string }> = {
  aprovado: { icon: "OK", className: "text-green-600 font-bold" },
  reprovado: { icon: "X", className: "text-red-500 font-bold" },
  rodando: { icon: "...", className: "text-yellow-500" },
  erro: { icon: "!", className: "text-orange-500" },
  entregue: { icon: "↑", className: "text-primary font-bold" },
};

const SUSPICION_LABELS: Record<string, string> = {
  paste_detected: "colagem detectada",
  very_fast_submission: "envio muito rapido",
  low_edit_count: "poucas edicoes no editor",
  similar_code: "codigo parecido com outro aluno",
};

export default async function ListaProgressoPage({ params }: { params: Params }) {
  const { id, lid } = await params;
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: lista } = await supabase
    .from("assignments")
    .select(
      "id, title, kind, due_at, class_id, class_unit_id, class:classes!class_id(id, name, owner_id)",
    )
    .eq("id", lid)
    .eq("class_id", id)
    .single();

  if (!lista) notFound();

  // Atividades de tipo especial têm telas dedicadas (não são lista de exercícios).
  // Redireciona para a página certa (rede de segurança para qualquer link antigo).
  if (lista.class_unit_id) {
    const cuBase = `/turmas/${id}/ucs/${lista.class_unit_id}`;
    if (lista.kind === "saep_simulado") redirect(`${cuBase}/simulados/${lista.id}`);
    if (lista.kind === "sap_pratico") redirect(`${cuBase}/sap/${lista.id}`);
    if (lista.kind === "projeto_integrador") redirect(`${cuBase}/projetos/${lista.id}`);
  }

  const cls = lista.class as unknown as {
    id: string;
    name: string;
    owner_id: string;
  };

  // "Gerenciar a lista" = gerenciar a turma (dono/co-docente/coordenador/admin).
  const isOwner = profile
    ? (await getAcessoTurma(id, profile, cls.owner_id)).podeGerenciar
    : false;

  const { data: assignmentExercises } = await supabase
    .from("assignment_exercises")
    .select("ord, exercise:exercises!exercise_id(id, title, exercise_type, is_group, response_template, canvas_config)")
    .eq("assignment_id", lid)
    .order("ord");

  const exercises: ExerciseRow[] = (assignmentExercises ?? [])
    .map((ae) => {
      // O exercício pode vir null se foi deletado e o vínculo ficou órfão.
      const ex = ae.exercise as unknown as {
        id: string;
        title: string;
        exercise_type?: string;
        is_group?: boolean;
        response_template?: string | null;
        canvas_config?: { width: number; height: number; palette?: string[] } | null;
      } | null;
      if (!ex) return null;
      return {
        id: ex.id,
        title: ex.title,
        ord: ae.ord,
        exercise_type: ex.exercise_type ?? "codigo",
        is_group: ex.is_group ?? false,
        response_template: ex.response_template ?? null,
        canvas_config: ex.canvas_config ?? null,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  if (isOwner) {
    // Exercícios disponíveis para anexar (públicos ou do professor).
    const { data: disponiveis } = await supabase
      .from("exercises")
      .select("id, title, exercise_type")
      .or(`is_public.eq.true,author_id.eq.${profile?.id}`)
      .order("created_at", { ascending: false });

    const { data: membros } = await supabase
      .from("class_members")
      .select("student:profiles!student_id(id, display_name)")
      .eq("class_id", id)
      .order("joined_at");

    const students: StudentRow[] = (membros ?? []).map((m) => {
      const student = m.student as unknown as StudentRow;
      return student;
    });

    const { data: allSubs } = await supabase
      .from("submissions")
      .select(
        "id, student_id, exercise_id, status, passed_count, total_count, created_at, code, paste_event_count, time_to_solve_ms, keystroke_count, suspicion_score, suspicion_reasons, manual_grade",
      )
      .eq("assignment_id", lid)
      .order("created_at", { ascending: false });

    // Modo prova: tentativas dos alunos (quem saiu da tela → entrega automática).
    const examAttempts =
      lista.kind === "prova"
        ? (
            await supabase
              .from("exam_attempts")
              .select("student_id, finished_at, left_screen")
              .eq("assignment_id", lid)
          ).data ?? []
        : [];
    const sairamDaTela = examAttempts.filter((a) => a.left_screen);

    const submissionMap = buildLatestSubmissionMap(
      (allSubs ?? []) as SubmissionRow[],
    );
    const studentNames = new Map(
      students.map((student) => [student.id, student.display_name]),
    );
    const similarityMap = buildSimilarityMap(submissionMap);
    const alerts = buildSuspicionAlerts(
      students,
      exercises,
      submissionMap,
      similarityMap,
      studentNames,
    );

    return (
      <div className="flex flex-col gap-6">
        <Header lista={lista} cls={cls} isOwner={isOwner} />

        {lista.kind === "prova" && sairamDaTela.length > 0 && (
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
            <span className="font-semibold text-warning">⚠️ Saída da tela na prova: </span>
            {sairamDaTela
              .map((a) => studentNames.get(a.student_id) ?? "aluno")
              .join(", ")}
            {" "}— a prova foi entregue automaticamente para {sairamDaTela.length === 1 ? "esse aluno" : "esses alunos"}.
          </div>
        )}

        <AnexarExercicios
          classId={id}
          assignmentId={lid}
          anexados={exercises.map((e) => ({
            id: e.id,
            title: e.title,
            exercise_type: e.exercise_type ?? "codigo",
          }))}
          disponiveis={(disponiveis ?? []).map((d) => ({
            id: d.id,
            title: d.title,
            exercise_type: d.exercise_type ?? "codigo",
          }))}
        />

        {exercises.length === 0 && <EmptyExercises isOwner={isOwner} />}

        {exercises.length > 0 && students.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhum aluno na turma ainda.
          </div>
        )}

        {exercises.length > 0 && students.length > 0 && (
          <>
            <SuspicionSummary alerts={alerts} />

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium">Aluno</th>
                    {exercises.map((exercise) => (
                      <th
                        key={exercise.id}
                        className="max-w-32 px-3 py-3 text-center font-medium"
                        title={exercise.title}
                      >
                        <span className="block max-w-28 truncate">
                          {exercise.title}
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => {
                    const byExercise = submissionMap.get(student.id);
                    const approved = approvedCount(byExercise);

                    return (
                      <tr
                        key={student.id}
                        className={index % 2 === 0 ? "bg-card" : "bg-muted/20"}
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-medium">
                          {student.display_name}
                        </td>
                        {exercises.map((exercise) => {
                          const sub = byExercise?.get(exercise.id);
                          const similar = similarityMap.get(
                            alertKey(student.id, exercise.id),
                          );
                          const style = sub
                            ? STATUS_ICON[sub.status] ?? {
                                icon: "?",
                                className: "text-muted-foreground",
                              }
                            : { icon: "-", className: "text-muted-foreground" };
                          const reasons = sub
                            ? getSuspicionReasons(sub, similar)
                            : [];

                          const cellInner = (
                            <>
                              <span className={style.className}>
                                {style.icon}
                              </span>
                              {reasons.length > 0 && (
                                <span className="ml-1 rounded-full bg-warning/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                                  !
                                </span>
                              )}
                              {sub?.manual_grade != null && (
                                <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                  {sub.manual_grade}
                                </span>
                              )}
                            </>
                          );

                          return (
                            <td
                              key={exercise.id}
                              className="px-3 py-3 text-center"
                              title={
                                sub
                                  ? buildSubmissionTitle(
                                      sub,
                                      reasons,
                                      similar,
                                      studentNames,
                                    ) + " · clique para corrigir"
                                  : "Nao enviado"
                              }
                            >
                              {sub ? (
                                <Link
                                  href={`/turmas/${id}/listas/${lid}/corrigir/${sub.id}`}
                                  className="inline-flex items-center rounded px-1 hover:bg-muted"
                                >
                                  {cellInner}
                                </Link>
                              ) : (
                                cellInner
                              )}
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
          </>
        )}

        <Legend />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-danger/40 bg-danger/10 p-6 text-sm">
        Perfil nao encontrado. Entre novamente para carregar seus dados.
      </div>
    );
  }

  const { data: mySubs } = await supabase
    .from("submissions")
    .select(
      "exercise_id, status, passed_count, total_count, created_at, manual_grade, manual_feedback, submission_link, response_text, submission_project",
    )
    .eq("assignment_id", lid)
    .eq("student_id", profile.id)
    .order("created_at", { ascending: false });

  type MySubRow = NonNullable<typeof mySubs>[number];
  const mySubMap = new Map<string, MySubRow>();
  for (const sub of mySubs ?? []) {
    if (!mySubMap.has(sub.exercise_id)) mySubMap.set(sub.exercise_id, sub);
  }

  const myApproved = [...mySubMap.values()].filter(
    (sub) => sub.status === "aprovado",
  ).length;

  // Modo prova: carrega a tentativa do aluno (iniciada/finalizada) e conta
  // quantas questões já têm alguma submissão (pra avisar antes de entregar).
  const isProva = lista.kind === "prova";
  let examEstado: "nao_iniciada" | "em_andamento" | "finalizada" = "nao_iniciada";
  let examLeftScreen = false;
  if (isProva) {
    const { data: attempt } = await supabase
      .from("exam_attempts")
      .select("started_at, finished_at, left_screen")
      .eq("assignment_id", lid)
      .eq("student_id", profile.id)
      .maybeSingle();
    if (attempt?.finished_at) examEstado = "finalizada";
    else if (attempt?.started_at) examEstado = "em_andamento";
    examLeftScreen = attempt?.left_screen ?? false;
  }
  const respondidas = exercises.filter((e) => mySubMap.has(e.id)).length;

  // Atividade em grupo? Carrega o grupo do aluno uma vez (pra mostrar o time).
  const temGrupo = exercises.some((e) => e.is_group);
  const meuGrupo = temGrupo ? await getMeuGrupo(id, profile.id) : null;

  const listaExercicios = (
    <div className="flex flex-col gap-2">
        {exercises.map((exercise) => {
          const sub = mySubMap.get(exercise.id);
          const tipoEx = exercise.exercise_type ?? "codigo";
          const isCode = isCodeKind(tipoEx);
          const isCreative = isCreativeKind(tipoEx);
          const style = sub
            ? STATUS_ICON[sub.status] ?? {
                icon: "?",
                className: "text-muted-foreground",
              }
            : { icon: "-", className: "text-muted-foreground" };

          return (
            <div
              key={exercise.id}
              className="rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">
                  {isCode ? (
                    <Link
                      href={`/exercicios/${exercise.id}`}
                      className="hover:text-primary"
                    >
                      {exercise.title}
                    </Link>
                  ) : (
                    exercise.title
                  )}
                  {exercise.is_group && (
                    <StatusBadge label="Grupo" tone="info" className="ml-2" />
                  )}
                </span>
                <div className="flex items-center gap-3">
                  {sub?.manual_grade != null && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                      Nota {sub.manual_grade}
                    </span>
                  )}
                  {sub && isCode && (
                    <span className="text-xs text-muted-foreground">
                      {sub.passed_count}/{sub.total_count} testes
                    </span>
                  )}
                  {!isCode && sub ? (
                    <StatusBadge status={sub.status} />
                  ) : (
                    <span className={`text-base ${style.className}`}>
                      {style.icon}
                    </span>
                  )}
                </div>
              </div>

              {/* Atividade em grupo: mostra o time e que a entrega é compartilhada */}
              {exercise.is_group && (
                <div className="mt-3 border-t border-border pt-3">
                  <MeuGrupoPanel grupo={meuGrupo} meuId={profile.id} />
                </div>
              )}

              {/* Entrega de arte (pixel/vetor/arte digital) — editor embutido */}
              {isCreative && (
                <div className="mt-3 border-t border-border pt-3">
                  <CreativeSubmission
                    kind={tipoEx as CreativeKind}
                    classId={id}
                    exerciseId={exercise.id}
                    assignmentId={lid}
                    config={exercise.canvas_config ?? DEFAULT_CONFIG[tipoEx as CreativeKind]}
                    initialProject={(sub?.submission_project as CreativeProject | null) ?? null}
                  />
                </div>
              )}

              {/* Entrega para apresentação / modelo de resposta */}
              {!isCode && !isCreative && (
                <EntregaForm
                  classId={id}
                  assignmentId={lid}
                  exerciseId={exercise.id}
                  tipo={exercise.exercise_type as "apresentacao" | "modelo_resposta"}
                  responseTemplate={exercise.response_template}
                  currentLink={sub?.submission_link}
                  currentResponse={sub?.response_text}
                />
              )}

              {sub?.manual_feedback && (
                <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
                  <div className="font-semibold text-primary">
                    Feedback do professor
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-foreground">
                    {sub.manual_feedback}
                  </p>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <Header lista={lista} cls={cls} isOwner={false} />

      {!isProva && (
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4">
          <div className="text-3xl font-bold text-primary">{myApproved}</div>
          <div className="text-sm text-muted-foreground">
            de {exercises.length} exercicio{exercises.length !== 1 ? "s" : ""}{" "}
            aprovado{myApproved !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {exercises.length === 0 && <EmptyExercises isOwner={false} />}

      {isProva ? (
        <ExamLockdown
          classId={id}
          assignmentId={lid}
          estadoInicial={examEstado}
          respondidas={respondidas}
          total={exercises.length}
          leftScreen={examLeftScreen}
        >
          {listaExercicios}
        </ExamLockdown>
      ) : (
        listaExercicios
      )}
    </div>
  );
}

function Header({
  lista,
  cls,
  isOwner,
}: {
  lista: {
    id: string;
    title: string;
    kind: string;
    due_at: string | null;
    class_id: string;
  };
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
          Voltar para {cls.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{lista.title}</h1>
        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
            {KIND_LABEL[lista.kind] ?? lista.kind}
          </span>
          {lista.due_at && (
            <span>
              Prazo:{" "}
              {new Date(lista.due_at).toLocaleDateString("pt-BR", {
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
          message="Excluir esta lista? As submissoes dos alunos serao mantidas."
        >
          <input type="hidden" name="id" value={lista.id} />
          <input type="hidden" name="class_id" value={lista.class_id} />
          <Button type="submit" variant="danger">
            Excluir lista
          </Button>
        </ConfirmForm>
      )}
    </div>
  );
}

function SuspicionSummary({
  alerts,
}: {
  alerts: {
    studentName: string;
    exerciseTitle: string;
    score: number;
    reasons: string[];
    similarWith: string | null;
  }[];
}) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        Nenhum sinal antifraude detectado nas submissoes mais recentes.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Sinais antifraude</h2>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium">
          {alerts.length} alerta{alerts.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {alerts.slice(0, 6).map((alert) => (
          <div
            key={`${alert.studentName}-${alert.exerciseTitle}-${alert.reasons.join("-")}`}
            className="rounded-lg border border-border bg-card p-3 text-xs"
          >
            <div className="font-semibold">
              {alert.studentName} - {alert.exerciseTitle}
            </div>
            <div className="mt-1 text-muted-foreground">
              Score {Math.round(alert.score * 100)}% -{" "}
              {alert.reasons
                .map((reason) => SUSPICION_LABELS[reason] ?? reason)
                .join(", ")}
              {alert.similarWith ? ` com ${alert.similarWith}` : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyExercises({ isOwner }: { isOwner: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
      {isOwner
        ? "Nenhum exercicio nesta lista ainda."
        : "Nenhum exercicio disponivel ainda."}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      <span>
        <span className="font-bold text-green-600">OK</span> Aprovado
      </span>
      <span>
        <span className="font-bold text-red-500">X</span> Reprovado
      </span>
      <span>
        <span className="text-yellow-500">...</span> Rodando
      </span>
      <span>
        <span className="text-orange-500">!</span> Erro
      </span>
      <span>
        <span className="rounded-full bg-warning/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
          !
        </span>{" "}
        Sinal antifraude
      </span>
      <span>- Nao enviado</span>
    </div>
  );
}

function buildLatestSubmissionMap(submissions: SubmissionRow[]) {
  const map = new Map<string, Map<string, SubmissionRow>>();
  for (const sub of submissions) {
    if (!map.has(sub.student_id)) {
      map.set(sub.student_id, new Map());
    }
    const byExercise = map.get(sub.student_id)!;
    if (!byExercise.has(sub.exercise_id)) {
      byExercise.set(sub.exercise_id, sub);
    }
  }
  return map;
}

function approvedCount(byExercise?: Map<string, SubmissionRow>) {
  if (!byExercise) return 0;
  return [...byExercise.values()].filter((sub) => sub.status === "aprovado")
    .length;
}

function buildSuspicionAlerts(
  students: StudentRow[],
  exercises: ExerciseRow[],
  submissionMap: Map<string, Map<string, SubmissionRow>>,
  similarityMap: Map<string, SimilarityAlert>,
  studentNames: Map<string, string>,
) {
  return students.flatMap((student) => {
    const byExercise = submissionMap.get(student.id);
    if (!byExercise) return [];

    return exercises.flatMap((exercise) => {
      const sub = byExercise.get(exercise.id);
      if (!sub) return [];

      const similar = similarityMap.get(alertKey(student.id, exercise.id));
      const reasons = getSuspicionReasons(sub, similar);
      if (reasons.length === 0) return [];

      return [
        {
          studentName: student.display_name,
          exerciseTitle: exercise.title,
          score: getSuspicionScore(sub, similar),
          reasons,
          similarWith: similar
            ? studentNames.get(similar.otherStudentId) ?? "outro aluno"
            : null,
        },
      ];
    });
  });
}

function buildSimilarityMap(
  submissionMap: Map<string, Map<string, SubmissionRow>>,
) {
  const byExercise = new Map<string, SubmissionRow[]>();
  for (const byStudent of submissionMap.values()) {
    for (const sub of byStudent.values()) {
      if (!sub.code) continue;
      if (!byExercise.has(sub.exercise_id)) byExercise.set(sub.exercise_id, []);
      byExercise.get(sub.exercise_id)!.push(sub);
    }
  }

  const result = new Map<string, SimilarityAlert>();
  for (const [exerciseId, submissions] of byExercise) {
    for (let i = 0; i < submissions.length; i++) {
      for (let j = i + 1; j < submissions.length; j++) {
        const left = submissions[i];
        const right = submissions[j];
        const score = codeSimilarity(left.code, right.code);
        if (score < 0.9) continue;

        setBestSimilarity(result, left.student_id, exerciseId, {
          score,
          otherStudentId: right.student_id,
        });
        setBestSimilarity(result, right.student_id, exerciseId, {
          score,
          otherStudentId: left.student_id,
        });
      }
    }
  }

  return result;
}

function setBestSimilarity(
  map: Map<string, SimilarityAlert>,
  studentId: string,
  exerciseId: string,
  alert: SimilarityAlert,
) {
  const key = alertKey(studentId, exerciseId);
  const current = map.get(key);
  if (!current || alert.score > current.score) map.set(key, alert);
}

function alertKey(studentId: string, exerciseId: string) {
  return `${studentId}:${exerciseId}`;
}

function codeSimilarity(left: string, right: string) {
  const a = normalizeCode(left);
  const b = normalizeCode(right);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const aTokens = new Set(a.split(" "));
  const bTokens = new Set(b.split(" "));
  const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

function normalizeCode(code: string) {
  return code
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getSuspicionReasons(
  sub: Pick<SubmissionRow, "suspicion_reasons">,
  similar?: SimilarityAlert,
) {
  const reasons = new Set(sub.suspicion_reasons ?? []);
  if (similar) reasons.add("similar_code");
  return [...reasons];
}

function getSuspicionScore(
  sub: Pick<SubmissionRow, "suspicion_score">,
  similar?: SimilarityAlert,
) {
  return Math.min(Math.max(sub.suspicion_score ?? 0, similar ? similar.score : 0), 1);
}

function buildSubmissionTitle(
  sub: SubmissionRow,
  reasons: string[],
  similar: SimilarityAlert | undefined,
  studentNames: Map<string, string>,
) {
  const details = [
    `${sub.passed_count}/${sub.total_count} testes`,
    `${sub.keystroke_count} edicoes`,
    `${sub.paste_event_count} paste`,
  ];

  if (sub.time_to_solve_ms !== null) {
    details.push(`${Math.round(sub.time_to_solve_ms / 1000)}s`);
  }

  if (reasons.length > 0) {
    details.push(
      `alertas: ${reasons
        .map((reason) => SUSPICION_LABELS[reason] ?? reason)
        .join(", ")}`,
    );
  }

  if (similar) {
    details.push(
      `similaridade ${Math.round(similar.score * 100)}% com ${
        studentNames.get(similar.otherStudentId) ?? "outro aluno"
      }`,
    );
  }

  return details.join(" - ");
}

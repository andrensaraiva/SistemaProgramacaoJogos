import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

import { ResponderDuelo } from "./_responder";

type Params = Promise<{ id: string; classUnitId: string; duelId: string }>;

export default async function DueloQuizJogarPage({ params }: { params: Params }) {
  const { id, classUnitId, duelId } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const admin = createAdminClient();
  const { data: duel } = await admin
    .from("quiz_duels")
    .select(
      "id, class_unit_id, challenger_id, opponent_id, winner_id, status, question_count, challenger_correct, opponent_correct, rating_delta",
    )
    .eq("id", duelId)
    .single();
  if (!duel || duel.class_unit_id !== classUnitId) notFound();

  const iAmPlayer =
    duel.challenger_id === profile.id || duel.opponent_id === profile.id;
  if (!iAmPlayer) redirect(`/turmas/${id}/ucs/${classUnitId}/duelos-quiz`);

  const backHref = `/turmas/${id}/ucs/${classUnitId}/duelos-quiz`;
  const crumbs = [
    { label: "Turmas", href: "/turmas" },
    { label: "Duelo de quiz", href: backHref },
    { label: duel.status === "concluido" ? "Resultado" : "Responder" },
  ];

  // Já finalizei?
  const { data: myFinish } = await admin
    .from("quiz_duel_finishes")
    .select("player_id, correct_count")
    .eq("duel_id", duelId)
    .eq("player_id", profile.id)
    .maybeSingle();

  const concluido = duel.status === "concluido";
  const showResult = concluido || Boolean(myFinish);

  // Questões do duelo.
  const { data: dq } = await admin
    .from("quiz_duel_questions")
    .select("ord, question:quiz_questions!question_id(id, contexto, comando, resolucao)")
    .eq("duel_id", duelId)
    .order("ord");
  const questionIds = (dq ?? []).map((r) => (r.question as unknown as { id: string }).id);

  const { data: options } = questionIds.length
    ? await admin
        .from("quiz_options")
        .select("id, question_id, label, text, is_correct, justification, ord")
        .in("question_id", questionIds)
        .order("ord")
    : { data: [] };

  // Minhas respostas (para o resultado).
  let myAnswers: Record<string, string | null> = {};
  if (showResult) {
    const { data: ans } = await admin
      .from("quiz_duel_answers")
      .select("question_id, selected_option_id")
      .eq("duel_id", duelId)
      .eq("player_id", profile.id);
    myAnswers = Object.fromEntries(
      (ans ?? []).map((a) => [a.question_id, a.selected_option_id]),
    );
  }

  const questions = (dq ?? []).map((r) => {
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
        // Gabarito só após finalizar.
        is_correct: showResult ? o.is_correct : undefined,
        justification: showResult ? o.justification ?? null : undefined,
      }));
    return {
      id: q.id,
      contexto: q.contexto,
      comando: q.comando,
      resolucao: showResult ? q.resolucao ?? null : null,
      options: opts,
      myOption: myAnswers[q.id] ?? null,
    };
  });

  // Resumo do placar quando concluído.
  const iAmChallenger = duel.challenger_id === profile.id;
  const myCorrect = iAmChallenger ? duel.challenger_correct : duel.opponent_correct;
  const oppCorrect = iAmChallenger ? duel.opponent_correct : duel.challenger_correct;
  const outcome = !duel.winner_id
    ? "empate"
    : duel.winner_id === profile.id
      ? "vitoria"
      : "derrota";

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={crumbs} />

      {concluido && (
        <div
          className={`rounded-2xl border p-5 ${
            outcome === "vitoria"
              ? "border-success/40 bg-success/10"
              : outcome === "derrota"
                ? "border-danger/40 bg-danger/10"
                : "border-border bg-card"
          }`}
        >
          <div className="text-2xl font-bold">
            {outcome === "vitoria" ? "Vitória! 🏆" : outcome === "derrota" ? "Derrota" : "Empate"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Você: {myCorrect ?? 0} acertos · Oponente: {oppCorrect ?? 0} acertos
            {duel.rating_delta != null && outcome !== "empate" && (
              <>
                {" "}
                · ELO {outcome === "vitoria" ? "+" : "-"}
                {duel.rating_delta}
              </>
            )}
          </div>
        </div>
      )}

      {showResult && !concluido && (
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Você respondeu ({myFinish?.correct_count ?? 0} acertos). Aguardando o
          oponente terminar para apurar o vencedor.
        </div>
      )}

      {showResult ? (
        <div className="flex flex-col gap-4">
          {questions.map((q, idx) => (
            <ResultQuestion key={q.id} index={idx + 1} q={q} />
          ))}
          <div>
            <Link href={backHref}>
              <Button variant="secondary">← Voltar aos duelos</Button>
            </Link>
          </div>
        </div>
      ) : (
        <ResponderDuelo
          duelId={duelId}
          backHref={backHref}
          questions={questions.map((q) => ({
            id: q.id,
            contexto: q.contexto,
            comando: q.comando,
            options: q.options.map((o) => ({ id: o.id, label: o.label, text: o.text })),
          }))}
        />
      )}
    </div>
  );
}

function ResultQuestion({
  index,
  q,
}: {
  index: number;
  q: {
    id: string;
    contexto: string;
    comando: string;
    resolucao: string | null;
    myOption: string | null;
    options: { id: string; label: string; text: string; is_correct?: boolean; justification?: string | null }[];
  };
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
        Questão {index}
      </div>
      <p className="whitespace-pre-wrap text-sm text-foreground">{q.contexto}</p>
      <p className="mt-2 font-medium">{q.comando}</p>
      <div className="mt-3 flex flex-col gap-2">
        {q.options.map((o) => {
          const isSel = q.myOption === o.id;
          let cls = "border-border bg-background";
          if (o.is_correct) cls = "border-success bg-success/10";
          else if (isSel) cls = "border-danger bg-danger/10";
          return (
            <div key={o.id} className={`rounded-lg border p-2.5 text-sm ${cls}`}>
              <div>
                <span className="font-semibold">{o.label})</span> {o.text}
                {isSel && <span className="ml-2 text-xs text-muted-foreground">(sua resposta)</span>}
                {o.is_correct && (
                  <span className="ml-2 text-xs font-semibold text-success">correta</span>
                )}
              </div>
              {o.justification && (
                <p className="mt-1 text-xs text-muted-foreground">{o.justification}</p>
              )}
            </div>
          );
        })}
      </div>
      {q.resolucao && (
        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
          <div className="font-semibold text-primary">Resolução</div>
          <p className="mt-1 whitespace-pre-wrap text-foreground">{q.resolucao}</p>
        </div>
      )}
    </div>
  );
}

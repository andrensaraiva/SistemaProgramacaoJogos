"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { enviarTentativa, iniciarTentativa } from "@/lib/saep/actions";

type Option = {
  id: string;
  label: string;
  text: string;
  is_correct?: boolean; // só vem após enviar (se feedback habilitado)
  justification?: string | null;
};
type Question = {
  id: string;
  contexto: string;
  comando: string;
  resolucao: string | null;
  options: Option[];
  myOption: string | null;
};
type Result = { score: number; correct: number; total: number };

export function ResponderSimulado({
  simuladoId,
  title,
  description,
  timeLimitMin,
  ucTitle,
  questions,
  submitted,
  result,
}: {
  simuladoId: string;
  title: string;
  description: string | null;
  timeLimitMin: number | null;
  ucTitle: string;
  questions: Question[];
  submitted: boolean;
  result: Result | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // started: o aluno iniciou a tentativa (cronômetro corre a partir daqui).
  const [started, setStarted] = useState(submitted);
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(
      questions.filter((q) => q.myOption).map((q) => [q.id, q.myOption as string]),
    ),
  );

  // ---- RESULTADO (já enviado) ----
  if (submitted) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{ucTitle} · Simulado SAEP</p>
        </div>

        {result && (
          <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-border bg-card p-5">
            <div>
              <div className="text-4xl font-bold text-primary">{Math.round(result.score)}%</div>
              <div className="text-sm text-muted-foreground">
                {result.correct} de {result.total} corretas
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {questions.map((q, idx) => (
            <QuestionResult key={q.id} index={idx + 1} q={q} selected={answers[q.id] ?? null} />
          ))}
        </div>
      </div>
    );
  }

  // ---- ANTES DE INICIAR ----
  if (!started) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{ucTitle} · Simulado SAEP</p>
        </div>
        {description && <p className="text-sm text-foreground">{description}</p>}
        <div className="rounded-2xl border border-border bg-card p-6">
          <ul className="mb-4 list-disc pl-5 text-sm text-muted-foreground">
            <li>{questions.length} questão(ões).</li>
            <li>
              {timeLimitMin ? `Tempo: ${timeLimitMin} minutos.` : "Sem tempo limite."}
            </li>
            <li>Você só pode enviar uma vez.</li>
          </ul>
          {error && (
            <div className="mb-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <Button
            type="button"
            disabled={pending || questions.length === 0}
            onClick={() =>
              startTransition(async () => {
                const res = await iniciarTentativa(simuladoId);
                if (!res.ok) {
                  setError(res.message);
                  return;
                }
                setStarted(true);
              })
            }
          >
            {questions.length === 0 ? "Sem questões ainda" : pending ? "Iniciando..." : "Iniciar simulado"}
          </Button>
        </div>
      </div>
    );
  }

  // ---- RESPONDENDO ----
  return (
    <AnsweringView
      simuladoId={simuladoId}
      title={title}
      ucTitle={ucTitle}
      timeLimitMin={timeLimitMin}
      questions={questions}
      answers={answers}
      setAnswers={setAnswers}
      onSubmitted={() => router.refresh()}
    />
  );
}

function AnsweringView({
  simuladoId,
  title,
  ucTitle,
  timeLimitMin,
  questions,
  answers,
  setAnswers,
  onSubmitted,
}: {
  simuladoId: string;
  title: string;
  ucTitle: string;
  timeLimitMin: number | null;
  questions: Question[];
  answers: Record<string, string>;
  setAnswers: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  onSubmitted: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(
    timeLimitMin ? timeLimitMin * 60 : null,
  );
  const submittedRef = useRef(false);

  function doSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setError(null);
    const payload = questions.map((q) => ({
      question_id: q.id,
      option_id: answers[q.id] ?? "",
    }));
    startTransition(async () => {
      const res = await enviarTentativa(simuladoId, payload);
      if (!res.ok) {
        setError(res.message);
        submittedRef.current = false;
        return;
      }
      onSubmitted();
    });
  }

  // Cronômetro: envia automaticamente ao zerar.
  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      doSubmit();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => (r === null ? r : r - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const answered = Object.keys(answers).length;
  const mm = remaining !== null ? Math.floor(remaining / 60) : 0;
  const ss = remaining !== null ? remaining % 60 : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-4 backdrop-blur">
        <div>
          <h1 className="text-lg font-bold">{title}</h1>
          <p className="text-xs text-muted-foreground">
            {ucTitle} · {answered}/{questions.length} respondidas
          </p>
        </div>
        {remaining !== null && (
          <div
            className={`rounded-lg px-3 py-1 font-mono text-lg font-bold ${
              remaining < 60 ? "bg-danger/15 text-danger" : "bg-muted"
            }`}
          >
            {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
          </div>
        )}
      </div>

      {questions.map((q, idx) => (
        <div key={q.id} className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            Questão {idx + 1}
          </div>
          <p className="whitespace-pre-wrap text-sm text-foreground">{q.contexto}</p>
          <p className="mt-2 font-medium">{q.comando}</p>
          <div className="mt-3 flex flex-col gap-2">
            {q.options.map((o) => {
              const sel = answers[q.id] === o.id;
              return (
                <label
                  key={o.id}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm ${
                    sel ? "border-primary bg-primary/5" : "border-border bg-background"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={sel}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: o.id }))}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-semibold">{o.label})</span> {o.text}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={doSubmit} disabled={pending}>
          {pending ? "Enviando..." : "Enviar simulado"}
        </Button>
        <span className="text-xs text-muted-foreground">
          {answered < questions.length
            ? `${questions.length - answered} sem resposta`
            : "Tudo respondido"}
        </span>
      </div>
    </div>
  );
}

function QuestionResult({
  index,
  q,
  selected,
}: {
  index: number;
  q: Question;
  selected: string | null;
}) {
  // Feedback só está disponível se o professor habilitou (is_correct presente).
  const hasFeedback = q.options.some((o) => o.is_correct !== undefined);
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
        Questão {index}
      </div>
      <p className="whitespace-pre-wrap text-sm text-foreground">{q.contexto}</p>
      <p className="mt-2 font-medium">{q.comando}</p>
      <div className="mt-3 flex flex-col gap-2">
        {q.options.map((o) => {
          const isSel = selected === o.id;
          let cls = "border-border bg-background";
          if (hasFeedback) {
            if (o.is_correct) cls = "border-success bg-success/10";
            else if (isSel) cls = "border-danger bg-danger/10";
          } else if (isSel) {
            cls = "border-primary bg-primary/5";
          }
          return (
            <div key={o.id} className={`rounded-lg border p-2.5 text-sm ${cls}`}>
              <div>
                <span className="font-semibold">{o.label})</span> {o.text}
                {isSel && <span className="ml-2 text-xs text-muted-foreground">(sua resposta)</span>}
                {hasFeedback && o.is_correct && (
                  <span className="ml-2 text-xs font-semibold text-success">correta</span>
                )}
              </div>
              {hasFeedback && o.justification && (
                <p className="mt-1 text-xs text-muted-foreground">{o.justification}</p>
              )}
            </div>
          );
        })}
      </div>
      {hasFeedback && q.resolucao && (
        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
          <div className="font-semibold text-primary">Resolução</div>
          <p className="mt-1 whitespace-pre-wrap text-foreground">{q.resolucao}</p>
        </div>
      )}
    </div>
  );
}

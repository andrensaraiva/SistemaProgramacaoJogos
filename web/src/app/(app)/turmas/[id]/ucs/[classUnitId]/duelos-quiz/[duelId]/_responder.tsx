"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { responderDueloQuiz } from "@/lib/saep/duelo";

type Option = { id: string; label: string; text: string };
type Question = { id: string; contexto: string; comando: string; options: Option[] };

// Responder o duelo de quiz: uma alternativa por questão, tempo cronometrado a
// partir da montagem (desempate), envio único.
export function ResponderDuelo({
  duelId,
  backHref,
  questions,
}: {
  duelId: string;
  backHref: string;
  questions: Question[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const startedAt = useRef<number | null>(null);
  const submittedRef = useRef(false);

  // Marca o início ao montar (fora do render, para não chamar Date.now() impuro).
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  function submit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setError(null);
    const totalMs = Date.now() - (startedAt.current ?? Date.now());
    const payload = questions.map((q) => ({
      question_id: q.id,
      option_id: answers[q.id] ?? "",
    }));
    startTransition(async () => {
      const res = await responderDueloQuiz(duelId, payload, totalMs);
      if (!res.ok) {
        setError(res.message);
        submittedRef.current = false;
        return;
      }
      router.refresh();
    });
  }

  const answered = Object.keys(answers).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Responda todas as questões e envie. Vence quem acerta mais — em caso de
        empate, o menor tempo. {answered}/{questions.length} respondidas.
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
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Enviando..." : "Enviar respostas"}
        </Button>
        <a href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
          Cancelar
        </a>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { avaliarSap } from "@/lib/sap/actions";
import { computeSapScore } from "@/lib/sap/scoring";

import type { RubricUnitView } from "./_manager";

type Mark = { met: boolean; justification: string };

// Avalia um aluno: marca Sim/Não por item (justificativa no Não) e fecha a nota.
// A nota prévia é calculada no cliente com a MESMA função pura do servidor.
export function Evaluator({
  assessmentId,
  studentId,
  studentName,
  rubric,
  initialMarks,
  initialFeedback,
  onClose,
}: {
  assessmentId: string;
  studentId: string;
  studentName: string;
  rubric: RubricUnitView[];
  initialMarks: Record<string, { met: boolean; justification: string | null }>;
  initialFeedback: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [marks, setMarks] = useState<Record<string, Mark>>(() => {
    const m: Record<string, Mark> = {};
    for (const [id, v] of Object.entries(initialMarks)) {
      m[id] = { met: v.met, justification: v.justification ?? "" };
    }
    return m;
  });

  const items = rubric.flatMap((u) =>
    u.elements.flatMap((e) => e.criteria.flatMap((c) => c.items.map((it) => ({ id: it.id, points: it.points })))),
  );
  const markBool = new Map(items.map((it) => [it.id, marks[it.id]?.met ?? false]));
  const { score, maxScore, pct } = computeSapScore(items, markBool);

  function setMark(id: string, patch: Partial<Mark>) {
    setMarks((prev) => ({ ...prev, [id]: { met: prev[id]?.met ?? false, justification: prev[id]?.justification ?? "", ...patch } }));
  }

  function save() {
    setError(null);
    const payload = items.map((it) => ({
      item_id: it.id,
      met: marks[it.id]?.met ?? false,
      justification: marks[it.id]?.justification,
    }));
    startTransition(async () => {
      const res = await avaliarSap(assessmentId, studentId, payload, feedback);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="rounded-2xl border border-primary/40 bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Avaliar: {studentName}</h3>
        <div className="text-sm">
          Nota parcial:{" "}
          <span className="font-bold text-primary">
            {score}/{maxScore}
          </span>{" "}
          {pct != null && <span className="text-muted-foreground">({pct}%)</span>}
        </div>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">Monte a lista de verificação antes de avaliar.</p>
      )}

      <div className="flex flex-col gap-3">
        {rubric.map((u) => (
          <div key={u.id}>
            <div className="text-sm font-semibold">
              {u.code ? `${u.code} · ` : ""}
              {u.title}
            </div>
            {u.elements.map((e) => (
              <div key={e.id} className="mt-1 pl-3">
                <div className="text-xs font-medium text-muted-foreground">
                  {e.code ? `${e.code} · ` : ""}
                  {e.title}
                </div>
                {e.criteria.map((c) => (
                  <div key={c.id} className="mt-1 pl-3">
                    <div className="text-xs text-muted-foreground">
                      {c.code ? `${c.code} · ` : ""}
                      {c.description}
                    </div>
                    <div className="mt-1 flex flex-col gap-1.5 pl-2">
                      {c.items.map((it) => {
                        const mk = marks[it.id];
                        const met = mk?.met ?? false;
                        return (
                          <div key={it.id} className="rounded-lg border border-border bg-background p-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-sm">
                                {it.code ? <span className="font-mono text-xs text-muted-foreground">{it.code} </span> : null}
                                {it.description}{" "}
                                <span className="text-xs text-muted-foreground">({it.points} pt)</span>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <button
                                  type="button"
                                  onClick={() => setMark(it.id, { met: true })}
                                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                                    met ? "bg-success text-white" : "border border-border hover:bg-muted"
                                  }`}
                                >
                                  Sim
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setMark(it.id, { met: false })}
                                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                                    !met ? "bg-danger text-white" : "border border-border hover:bg-muted"
                                  }`}
                                >
                                  Não
                                </button>
                              </div>
                            </div>
                            {!met && (
                              <input
                                value={mk?.justification ?? ""}
                                onChange={(e) => setMark(it.id, { justification: e.target.value })}
                                placeholder="Justificativa do Não (opcional)"
                                className="mt-1 w-full rounded border border-border bg-card px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-3">
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={2}
          placeholder="Feedback geral para o aluno (opcional)"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {error && (
        <div className="mt-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
      )}

      <div className="mt-3 flex gap-2">
        <Button type="button" onClick={save} disabled={pending || items.length === 0}>
          {pending ? "Salvando..." : "Salvar avaliação"}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
}

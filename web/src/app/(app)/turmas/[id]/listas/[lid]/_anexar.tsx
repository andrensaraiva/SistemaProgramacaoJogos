"use client";

import { useState, useTransition } from "react";

import { ConfirmForm } from "@/components/confirm-form";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { anexarExercicio, removerExercicio } from "@/lib/assignments/actions";

type Disponivel = { id: string; title: string; exercise_type: string };
type Anexado = { id: string; title: string; exercise_type: string };

const TIPO: Record<string, string> = {
  codigo: "Código",
  apresentacao: "Apresentação",
  modelo_resposta: "Modelo de resposta",
};

export function AnexarExercicios({
  classId,
  assignmentId,
  anexados,
  disponiveis,
}: {
  classId: string;
  assignmentId: string;
  anexados: Anexado[];
  disponiveis: Disponivel[];
}) {
  const [sel, setSel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const jaAnexados = new Set(anexados.map((a) => a.id));
  const opcoes = disponiveis.filter((d) => !jaAnexados.has(d.id));

  function anexar() {
    if (!sel) return;
    setError(null);
    const fd = new FormData();
    fd.set("assignment_id", assignmentId);
    fd.set("exercise_id", sel);
    start(async () => {
      const res = await anexarExercicio(classId, fd);
      if (!res.ok) setError(res.message);
      else setSel("");
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Exercícios da lista</h2>

      {anexados.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {anexados.map((ex) => (
            <li
              key={ex.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
            >
              <span>
                {ex.title}
                <StatusBadge
                  label={TIPO[ex.exercise_type] ?? ex.exercise_type}
                  tone="neutral"
                  className="ml-2"
                />
              </span>
              <ConfirmForm action={removerExercicio} message="Remover este exercício da lista?">
                <input type="hidden" name="class_id" value={classId} />
                <input type="hidden" name="assignment_id" value={assignmentId} />
                <input type="hidden" name="exercise_id" value={ex.id} />
                <Button type="submit" variant="ghost">
                  ✕
                </Button>
              </ConfirmForm>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Nenhum exercício na lista ainda.</p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <select
          value={sel}
          onChange={(e) => setSel(e.target.value)}
          className="min-w-64 rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Selecione um exercício...</option>
          {opcoes.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title} — {TIPO[d.exercise_type] ?? d.exercise_type}
            </option>
          ))}
        </select>
        <Button type="button" onClick={anexar} disabled={pending || !sel}>
          {pending ? "Anexando..." : "+ Anexar"}
        </Button>
      </div>
      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
    </section>
  );
}

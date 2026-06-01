"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { criarSprint } from "@/lib/projects/actions";

// Criação de sprint pelo professor. Recolhível para não poluir a tela.
export function SprintForm({ projectId }: { projectId: string }) {
  const bound = criarSprint.bind(null, projectId);
  const [state, action, pending] = useActionState(bound, undefined);

  return (
    <details className="rounded-xl border border-border bg-card p-4">
      <summary className="cursor-pointer text-sm font-medium">
        + Nova sprint
      </summary>
      <form action={action} className="mt-4 flex flex-col gap-3">
        <Field label="Título" htmlFor="sprint_title">
          <Input
            id="sprint_title"
            name="title"
            placeholder="Sprint 1 — Levantamento"
            required
          />
        </Field>
        <Field label="Meta (opcional)" htmlFor="sprint_goal">
          <Input id="sprint_goal" name="goal" placeholder="O que entregar nesta sprint" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início" htmlFor="starts_on">
            <Input id="starts_on" name="starts_on" type="date" />
          </Field>
          <Field label="Fim" htmlFor="ends_on">
            <Input id="ends_on" name="ends_on" type="date" />
          </Field>
        </div>

        {state && !state.ok && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {state.message}
          </div>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? "Adicionando..." : "Adicionar sprint"}
        </Button>
      </form>
    </details>
  );
}

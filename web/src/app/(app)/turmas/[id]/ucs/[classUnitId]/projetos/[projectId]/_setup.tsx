"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { criarOuObterProjeto } from "@/lib/projects/actions";

// Configuração inicial do projeto (só o professor). Define título e descrição
// (objetivo/entregas/critérios). Depois de criar, a página recarrega mostrando
// sprints e boards.
export function ProjetoSetup({
  classId,
  classUnitId,
  assignmentId,
  defaultTitle,
}: {
  classId: string;
  classUnitId: string;
  assignmentId: string;
  defaultTitle: string;
}) {
  const bound = criarOuObterProjeto.bind(null, classId, classUnitId, assignmentId);
  const [state, action, pending] = useActionState(bound, undefined);

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6"
    >
      <h2 className="text-lg font-semibold">Configurar projeto integrador</h2>

      <Field label="Título do projeto" htmlFor="title">
        <Input id="title" name="title" defaultValue={defaultTitle} required />
      </Field>

      <Field label="Descrição / objetivo (opcional)" htmlFor="description">
        <textarea
          id="description"
          name="description"
          rows={5}
          placeholder="Objetivo do projeto, entregas esperadas, critérios de avaliação..."
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </Field>

      {state && !state.ok && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Criar projeto"}
      </Button>
    </form>
  );
}

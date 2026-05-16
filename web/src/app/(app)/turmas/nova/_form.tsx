"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { criarTurma } from "@/lib/turmas/actions";

export function NovaTurmaForm() {
  const [state, action, pending] = useActionState(criarTurma, undefined);

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Nome da turma" htmlFor="name" error={state?.errors?.name?.[0]}>
        <Input
          id="name"
          name="name"
          placeholder="Ex: Programação de Jogos — 2025/1"
          required
        />
      </Field>

      <Field
        label="Descrição (opcional)"
        htmlFor="description"
        error={state?.errors?.description?.[0]}
      >
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Uma frase sobre o foco da turma..."
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
      </Field>

      {state?.message && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Criar turma"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

import { createDuel, joinDuel } from "./actions";

export function DuelForms({
  exercises,
}: {
  exercises: { id: string; title: string }[];
}) {
  const [createState, createAction, creating] = useActionState(
    createDuel,
    undefined,
  );
  const [joinState, joinAction, joining] = useActionState(joinDuel, undefined);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form
        action={createAction}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <h2 className="font-semibold">Criar duelo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha um exercicio e compartilhe o codigo gerado.
        </p>
        <Field
          label="Exercicio"
          htmlFor="exercise_id"
          error={createState?.errors?.exercise_id?.[0]}
        >
          <select
            id="exercise_id"
            name="exercise_id"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
            required
          >
            <option value="">Selecione</option>
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.title}
              </option>
            ))}
          </select>
        </Field>
        {createState?.message && (
          <div className="mt-3 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            {createState.message}
          </div>
        )}
        <div className="mt-4">
          <Button type="submit" disabled={creating}>
            {creating ? "Criando..." : "Criar duelo"}
          </Button>
        </div>
      </form>

      <form
        action={joinAction}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <h2 className="font-semibold">Entrar em duelo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use o codigo recebido de outro aluno.
        </p>
        <Field
          label="Codigo"
          htmlFor="invite_code"
          error={joinState?.errors?.invite_code?.[0]}
        >
          <Input
            id="invite_code"
            name="invite_code"
            placeholder="ex: a1b2c3d4"
            required
          />
        </Field>
        {joinState?.message && (
          <div className="mt-3 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            {joinState.message}
          </div>
        )}
        <div className="mt-4">
          <Button type="submit" disabled={joining}>
            {joining ? "Entrando..." : "Entrar"}
          </Button>
        </div>
      </form>
    </div>
  );
}

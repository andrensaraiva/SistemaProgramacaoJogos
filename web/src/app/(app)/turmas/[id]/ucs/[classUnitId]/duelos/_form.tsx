"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { createDuelNaUc } from "@/app/(app)/duelos/actions";

type ExerciseRow = { id: string; title: string };

export function NovoDueloForm({
  classId,
  classUnitId,
  exercises,
}: {
  classId: string;
  classUnitId: string;
  exercises: ExerciseRow[];
}) {
  const boundAction = createDuelNaUc.bind(null, classId, classUnitId);
  const [state, action, pending] = useActionState(boundAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field
        label="Exercício do duelo"
        htmlFor="exercise_id"
        error={state?.errors?.exercise_id?.[0]}
      >
        <select
          id="exercise_id"
          name="exercise_id"
          required
          defaultValue=""
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="" disabled>
            Selecione um exercício
          </option>
          {exercises.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </Field>

      {state?.message && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Criar duelo"}
      </Button>
    </form>
  );
}

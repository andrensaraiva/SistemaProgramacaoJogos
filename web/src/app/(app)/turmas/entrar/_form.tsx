"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { entrarNaTurma } from "@/lib/turmas/actions";

export function EntrarTurmaForm() {
  const [state, action, pending] = useActionState(entrarNaTurma, undefined);

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field
        label="Código de convite"
        htmlFor="invite_code"
        error={state?.errors?.invite_code?.[0]}
      >
        <Input
          id="invite_code"
          name="invite_code"
          placeholder="Ex: a1b2c3d4"
          autoComplete="off"
          className="font-mono tracking-widest uppercase"
          required
        />
      </Field>

      {state?.message && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Entrando..." : "Entrar na turma"}
      </Button>
    </form>
  );
}

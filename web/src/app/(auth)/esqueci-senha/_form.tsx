"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { solicitarReset } from "@/lib/auth/actions";

export function EsqueciForm() {
  const [state, action, pending] = useActionState(solicitarReset, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="E-mail" htmlFor="email" error={state?.errors?.email?.[0]}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>

      {state?.message && (
        <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-foreground">
          {state.message}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Enviando..." : "Solicitar redefinição"}
      </Button>
    </form>
  );
}

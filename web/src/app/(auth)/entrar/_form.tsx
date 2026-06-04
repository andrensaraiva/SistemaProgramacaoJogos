"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { login } from "@/lib/auth/actions";

export function LoginForm({ proximo }: { proximo: string }) {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="proximo" value={proximo} />

      <Field
        label="E-mail (institucional ou pessoal)"
        htmlFor="email"
        error={state?.errors?.email?.[0]}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </Field>

      <Field
        label="Senha"
        htmlFor="password"
        error={state?.errors?.password?.[0]}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      {state?.message && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}

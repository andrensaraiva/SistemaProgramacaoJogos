"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { signup } from "@/lib/auth/actions";

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined);
  const [role, setRole] = useState<"aluno" | "professor">("aluno");

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field
        label="Nome"
        htmlFor="display_name"
        error={state?.errors?.display_name?.[0]}
      >
        <Input
          id="display_name"
          name="display_name"
          autoComplete="name"
          required
        />
      </Field>

      <Field
        label="E-mail"
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
          autoComplete="new-password"
          minLength={6}
          required
        />
      </Field>

      <Field label="Eu sou" htmlFor="role">
        <input type="hidden" name="role" value={role} />
        <div className="grid grid-cols-2 gap-2">
          {(["aluno", "professor"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                role === r
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </Field>

      {state?.message && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Criar conta"}
      </Button>
    </form>
  );
}

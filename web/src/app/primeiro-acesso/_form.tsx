"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { concluirPrimeiroAcesso } from "@/lib/auth/actions";

export function PrimeiroAcessoForm({
  personalEmail,
  institutionalEmail,
}: {
  personalEmail: string;
  institutionalEmail: string;
}) {
  const [state, action, pending] = useActionState(concluirPrimeiroAcesso, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Nova senha</h2>
        <div className="flex flex-col gap-4">
          <Field label="Nova senha" htmlFor="password" error={state?.errors?.password?.[0]}>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
          </Field>
          <Field label="Confirmar senha" htmlFor="confirm" error={state?.errors?.confirm?.[0]}>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
            />
          </Field>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold">Seus e-mails</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Você pode entrar com qualquer um deles. Informe ao menos um.
        </p>
        <div className="flex flex-col gap-4">
          <Field
            label="E-mail institucional"
            htmlFor="institutional_email"
            error={state?.errors?.institutional_email?.[0]}
          >
            <Input
              id="institutional_email"
              name="institutional_email"
              type="email"
              autoComplete="email"
              defaultValue={institutionalEmail}
            />
          </Field>
          <Field label="E-mail pessoal" htmlFor="personal_email">
            <Input
              id="personal_email"
              name="personal_email"
              type="email"
              autoComplete="email"
              defaultValue={personalEmail}
            />
          </Field>
        </div>
      </div>

      {state?.message && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Concluir e entrar"}
      </Button>
    </form>
  );
}

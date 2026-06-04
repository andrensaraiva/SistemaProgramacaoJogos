"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import {
  criarProfessor,
  resolverPedidoReset,
  type AdminActionState,
} from "@/lib/admin/actions";

function TempPasswordBox({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
      {message}
    </div>
  );
}

export function NovoProfessorForm() {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    criarProfessor,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field
        label="Nome completo"
        htmlFor="display_name"
        error={state && "errors" in state ? state.errors?.display_name?.[0] : undefined}
      >
        <Input id="display_name" name="display_name" required />
      </Field>
      <Field
        label="E-mail institucional"
        htmlFor="institutional_email"
        error={
          state && "errors" in state ? state.errors?.institutional_email?.[0] : undefined
        }
      >
        <Input id="institutional_email" name="institutional_email" type="email" />
      </Field>
      <Field label="E-mail pessoal (opcional)" htmlFor="personal_email">
        <Input id="personal_email" name="personal_email" type="email" />
      </Field>

      {state?.ok && state.message && <TempPasswordBox message={state.message} />}
      {state && !state.ok && state.message && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Criar professor"}
      </Button>
    </form>
  );
}

export function PedidoResetItem({
  id,
  nome,
  email,
  papel,
}: {
  id: string;
  nome: string;
  email: string;
  papel: string;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    resolverPedidoReset,
    undefined,
  );

  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{nome}</div>
          <div className="text-xs text-muted-foreground">
            {email} · {papel}
          </div>
        </div>
        <form action={action} className="flex gap-2">
          <input type="hidden" name="request_id" value={id} />
          <Button
            type="submit"
            name="acao"
            value="aprovar"
            variant="primary"
            disabled={pending}
            className="px-3 py-1.5 text-xs"
          >
            Aprovar
          </Button>
          <Button
            type="submit"
            name="acao"
            value="recusar"
            variant="ghost"
            disabled={pending}
            className="px-3 py-1.5 text-xs"
          >
            Recusar
          </Button>
        </form>
      </div>
      {state?.ok && state.message && (
        <div className="mt-2">
          <TempPasswordBox message={state.message} />
        </div>
      )}
      {state && !state.ok && state.message && (
        <p className="mt-2 text-xs text-danger">{state.message}</p>
      )}
    </li>
  );
}

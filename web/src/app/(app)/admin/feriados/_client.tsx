"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import {
  criarFeriado,
  removerFeriado,
  type HolidayState,
} from "@/lib/calendar/holidays";
import { HOLIDAY_KINDS } from "@/lib/calendar/kinds";

const selCls =
  "rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

export function NovoFeriadoForm() {
  const [state, action, pending] = useActionState<HolidayState, FormData>(criarFeriado, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <Field label="Data" htmlFor="date">
        <Input id="date" name="date" type="date" required />
      </Field>
      <Field label="Nome" htmlFor="name">
        <Input id="name" name="name" placeholder="Ex: Tiradentes" required />
      </Field>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Tipo</span>
        <select name="kind" className={selCls} defaultValue="feriado">
          {HOLIDAY_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Adicionando..." : "Adicionar"}
      </Button>
      {state && (
        <span className={`text-xs ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</span>
      )}
    </form>
  );
}

export function RemoverFeriadoButton({ id }: { id: string }) {
  return (
    <form action={removerFeriado}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" className="px-2 py-1 text-xs text-danger">
        remover
      </Button>
    </form>
  );
}

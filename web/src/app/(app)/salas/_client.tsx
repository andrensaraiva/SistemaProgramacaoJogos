"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { criarSala, removerSala, type RoomState } from "@/lib/rooms/actions";
import { ROOM_KINDS } from "@/lib/rooms/kinds";

const selCls =
  "rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

export function NovaSalaForm() {
  const [state, action, pending] = useActionState<RoomState, FormData>(criarSala, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <Field label="Nome" htmlFor="name">
        <Input id="name" name="name" placeholder="Ex: Sala 101 / Lab 1004" required />
      </Field>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Tipo</span>
        <select name="kind" className={selCls} defaultValue="sala">
          {ROOM_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <Field label="Capacidade" htmlFor="capacity">
        <Input id="capacity" name="capacity" type="number" min={0} className="w-24" placeholder="—" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Cadastrar"}
      </Button>
      {state && (
        <span className={`text-xs ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</span>
      )}
    </form>
  );
}

export function RemoverSalaButton({ id }: { id: string }) {
  return (
    <form action={removerSala}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" className="px-2 py-1 text-xs text-danger">
        remover
      </Button>
    </form>
  );
}

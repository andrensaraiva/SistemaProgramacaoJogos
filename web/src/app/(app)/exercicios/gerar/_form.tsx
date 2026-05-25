"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

import { generateExerciseAction } from "./actions";

export function GenerateExerciseForm() {
  const [state, action, pending] = useActionState(
    generateExerciseAction,
    undefined,
  );

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4">
      <Field
        label="Pedido para IA"
        htmlFor="prompt"
        error={state?.errors?.prompt?.[0]}
      >
        <textarea
          id="prompt"
          name="prompt"
          required
          rows={6}
          placeholder="Ex: crie um exercicio sobre calcular dano de ataque em um RPG usando dois numeros de entrada"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Dificuldade"
          htmlFor="difficulty"
          error={state?.errors?.difficulty?.[0]}
        >
          <select
            id="difficulty"
            name="difficulty"
            defaultValue="facil"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
          >
            <option value="facil">Facil</option>
            <option value="medio">Medio</option>
            <option value="dificil">Dificil</option>
            <option value="desafio">Desafio</option>
          </select>
        </Field>

        <Field
          label="XP"
          htmlFor="xp_reward"
          error={state?.errors?.xp_reward?.[0]}
        >
          <Input
            id="xp_reward"
            name="xp_reward"
            type="number"
            min={5}
            max={200}
            defaultValue={20}
            required
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_public"
          defaultChecked
          className="h-4 w-4 accent-primary"
        />
        Publicar na lista geral de exercicios
      </label>

      {state?.message && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </div>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Gerando..." : "Gerar exercicio"}
        </Button>
      </div>
    </form>
  );
}

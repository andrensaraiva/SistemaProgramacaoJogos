"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { criarAtividadeNaUc } from "@/lib/turmas/actions";

type Block = { id: string; title: string };

export function NovaAtividadeForm({
  classId,
  classUnitId,
  blocks,
}: {
  classId: string;
  classUnitId: string;
  blocks: Block[];
}) {
  const boundAction = criarAtividadeNaUc.bind(null, classId, classUnitId);
  const [state, action, pending] = useActionState(boundAction, undefined);

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Título" htmlFor="title" error={state?.errors?.title?.[0]}>
        <Input
          id="title"
          name="title"
          placeholder="Ex: Lista 1 — Variáveis e Operadores"
          required
        />
      </Field>

      <Field label="Tipo" htmlFor="kind" error={state?.errors?.kind?.[0]}>
        <select
          id="kind"
          name="kind"
          defaultValue="lista"
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="lista">Lista de exercícios</option>
          <option value="desafio">Desafio</option>
          <option value="prova">Prova</option>
          <option value="duelo">Duelo (X1)</option>
          <option value="unity">Unity (GitHub Classroom)</option>
          <option value="projeto_integrador">Projeto integrador</option>
          <option value="saep_simulado">Simulado SAEP (teórico)</option>
          <option value="sap_pratico">SAP prático (lista de verificação)</option>
        </select>
      </Field>

      {blocks.length > 0 && (
        <Field
          label="Atrelar à aula/bloco (opcional)"
          htmlFor="teaching_plan_block_id"
        >
          <select
            id="teaching_plan_block_id"
            name="teaching_plan_block_id"
            defaultValue=""
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">— Sem vínculo —</option>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field
        label="Prazo (opcional)"
        htmlFor="due_at"
        error={state?.errors?.due_at?.[0]}
      >
        <Input id="due_at" name="due_at" type="datetime-local" />
      </Field>

      {state?.message && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Criar atividade"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { criarExercicioManual, type NovoExercicioState } from "./actions";

type Lang = { id: string; label: string };
type Tipo = "codigo" | "apresentacao" | "modelo_resposta";

const taCls =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y";
const selCls =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

const TIPOS: { value: Tipo; label: string; hint: string }[] = [
  { value: "codigo", label: "Código", hint: "Aluno resolve no editor; testado automaticamente." },
  { value: "apresentacao", label: "Apresentação (link)", hint: "Aluno entrega um link (slides, Drive); você corrige a nota." },
  { value: "modelo_resposta", label: "Modelo de resposta", hint: "Aluno preenche um texto a partir de um modelo; você corrige." },
];

export function NovoExercicioForm({ languages }: { languages: Lang[] }) {
  const [state, action, pending] = useActionState<NovoExercicioState, FormData>(
    criarExercicioManual,
    undefined,
  );
  const [tipo, setTipo] = useState<Tipo>("codigo");
  const err = state?.errors;

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-5">
      <Field label="Título" htmlFor="title" error={err?.title?.[0]}>
        <Input id="title" name="title" required placeholder="Ex: Apresentação do protótipo" />
      </Field>

      <Field label="Enunciado / descrição" htmlFor="description" error={err?.description?.[0]}>
        <textarea id="description" name="description" rows={4} required className={taCls} placeholder="O que o aluno deve fazer..." />
      </Field>

      <Field label="Tipo de exercício" htmlFor="exercise_type">
        <select
          id="exercise_type"
          name="exercise_type"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as Tipo)}
          className={selCls}
        >
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <span className="mt-1 text-xs text-muted-foreground">
          {TIPOS.find((t) => t.value === tipo)?.hint}
        </span>
      </Field>

      {/* Campos do tipo CÓDIGO */}
      {tipo === "codigo" && (
        <>
          <Field label="Linguagem" htmlFor="language_id" error={err?.language_id?.[0]}>
            <select id="language_id" name="language_id" className={selCls} defaultValue={languages[0]?.id}>
              {languages.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Código inicial (starter)" htmlFor="starter_code">
            <textarea id="starter_code" name="starter_code" rows={6} className={`${taCls} font-mono`} placeholder="// código inicial mostrado ao aluno" />
          </Field>
          <p className="text-xs text-muted-foreground">
            Você poderá adicionar os casos de teste depois, na página do exercício.
          </p>
        </>
      )}

      {/* Campos do tipo MODELO DE RESPOSTA */}
      {tipo === "modelo_resposta" && (
        <Field label="Modelo de resposta (opcional)" htmlFor="response_template">
          <textarea id="response_template" name="response_template" rows={5} className={taCls} placeholder="Estrutura/modelo que o aluno deve seguir ao responder..." />
        </Field>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_group" className="h-4 w-4" />
        Trabalho em grupo (a entrega vale para todo o grupo)
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dificuldade" htmlFor="difficulty">
          <select id="difficulty" name="difficulty" className={selCls} defaultValue="facil">
            <option value="facil">Fácil</option>
            <option value="medio">Médio</option>
            <option value="dificil">Difícil</option>
            <option value="desafio">Desafio</option>
          </select>
        </Field>
        <Field label="XP (só código)" htmlFor="xp_reward">
          <Input id="xp_reward" name="xp_reward" type="number" min={0} max={200} defaultValue={10} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_public" defaultChecked className="h-4 w-4" />
        Visível no catálogo de exercícios
      </label>

      {state?.message && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Criar exercício"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

import { syncGithubRepo } from "./actions";

export function GithubRepoForm({
  classes,
}: {
  classes: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(syncGithubRepo, undefined);

  return (
    <form action={action} className="rounded-2xl border border-border bg-card p-5">
      <div>
        <h2 className="font-semibold">Sincronizar repositorio</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulte a ultima execucao do GitHub Actions e salve a nota estimada.
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field
          label="Repositorio"
          htmlFor="repo_full_name"
          error={state?.errors?.repo_full_name?.[0]}
        >
          <Input
            id="repo_full_name"
            name="repo_full_name"
            placeholder="organizacao/repositorio"
            required
          />
        </Field>

        <Field label="Turma" htmlFor="class_id" error={state?.errors?.class_id?.[0]}>
          <select
            id="class_id"
            name="class_id"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Sem turma vinculada</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Aluno"
          htmlFor="student_name"
          error={state?.errors?.student_name?.[0]}
        >
          <Input id="student_name" name="student_name" placeholder="Nome do aluno" />
        </Field>

        <Field
          label="Atividade"
          htmlFor="assignment_title"
          error={state?.errors?.assignment_title?.[0]}
        >
          <Input
            id="assignment_title"
            name="assignment_title"
            placeholder="Lista Unity 01"
          />
        </Field>
      </div>

      {state?.message && (
        <div className="mt-4 rounded-md border border-border bg-muted p-3 text-sm">
          {state.message}
        </div>
      )}

      <div className="mt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Sincronizando..." : "Sincronizar"}
        </Button>
      </div>
    </form>
  );
}

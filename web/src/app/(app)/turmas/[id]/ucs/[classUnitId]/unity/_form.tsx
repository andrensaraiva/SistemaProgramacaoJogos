"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { syncGithubRepo } from "@/app/(app)/unity/github/actions";

// Form de sincronização do GitHub Classroom já vinculado a esta UC. class_id e
// class_unit_id vão como campos ocultos; o resto é igual à tela global.
export function UnityRepoForm({
  classId,
  classUnitId,
}: {
  classId: string;
  classUnitId: string;
}) {
  const [state, action, pending] = useActionState(syncGithubRepo, undefined);

  return (
    <form action={action} className="rounded-2xl border border-border bg-card p-5">
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="class_unit_id" value={classUnitId} />

      <div>
        <h2 className="font-semibold">Sincronizar repositório</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulta a última execução do GitHub Actions e salva a nota estimada
          nesta unidade curricular.
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field
          label="Repositório"
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

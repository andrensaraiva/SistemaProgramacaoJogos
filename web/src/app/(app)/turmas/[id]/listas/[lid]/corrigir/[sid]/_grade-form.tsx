"use client";

import dynamic from "next/dynamic";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { gradeSubmission, type GradeState } from "@/lib/grading/actions";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[420px] place-items-center rounded-md border border-border bg-muted text-sm text-muted-foreground">
        Carregando código…
      </div>
    ),
  },
);

type Props = {
  classId: string;
  assignmentId: string;
  submissionId: string;
  code: string;
  monacoLanguage: string;
  currentGrade: number | null;
  currentFeedback: string | null;
};

export function GradeForm({
  classId,
  assignmentId,
  submissionId,
  code,
  monacoLanguage,
  currentGrade,
  currentFeedback,
}: Props) {
  const action = gradeSubmission.bind(null, classId, assignmentId);
  const [state, formAction, pending] = useActionState<GradeState, FormData>(
    action,
    undefined,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      {/* Código do aluno (somente leitura) */}
      <div className="overflow-hidden rounded-2xl border border-border">
        <MonacoEditor
          height="480px"
          language={monacoLanguage}
          value={code}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>

      {/* Formulário de correção */}
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="submission_id" value={submissionId} />

        <div>
          <label className="text-sm font-medium" htmlFor="grade">
            Nota (0 a 10)
          </label>
          <input
            id="grade"
            name="grade"
            type="number"
            min={0}
            max={10}
            step={0.1}
            defaultValue={currentGrade ?? ""}
            placeholder="Ex: 8.5 (deixe vazio para não atribuir)"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-1 flex-col">
          <label className="text-sm font-medium" htmlFor="feedback">
            Feedback para o aluno
          </label>
          <textarea
            id="feedback"
            name="feedback"
            rows={10}
            defaultValue={currentFeedback ?? ""}
            placeholder="Comentários, sugestões, o que melhorar…"
            className="mt-1 w-full flex-1 rounded-md border border-input bg-background p-3 font-mono text-sm"
          />
        </div>

        {state && (
          <div
            className={`rounded-md border p-3 text-sm ${
              state.ok
                ? "border-success/40 bg-success/10 text-success"
                : "border-danger/40 bg-danger/10 text-danger"
            }`}
          >
            {state.message}
          </div>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar correção"}
        </Button>
      </form>
    </div>
  );
}

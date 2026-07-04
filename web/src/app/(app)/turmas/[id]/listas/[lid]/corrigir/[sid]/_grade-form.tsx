"use client";

import dynamic from "next/dynamic";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { isCodeKind } from "@/lib/activities/registry";
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
  exerciseType: string;
  code: string | null;
  submissionLink: string | null;
  responseText: string | null;
  monacoLanguage: string;
  currentGrade: number | null;
  currentFeedback: string | null;
};

export function GradeForm({
  classId,
  assignmentId,
  submissionId,
  exerciseType,
  code,
  submissionLink,
  responseText,
  monacoLanguage,
  currentGrade,
  currentFeedback,
}: Props) {
  const action = gradeSubmission.bind(null, classId, assignmentId);
  const [state, formAction, pending] = useActionState<GradeState, FormData>(
    action,
    undefined,
  );

  const isCode = isCodeKind(exerciseType);

  // Campos controlados pra a IA poder preencher (o professor confirma/edita).
  const [grade, setGrade] = useState(currentGrade != null ? String(currentGrade) : "");
  const [feedback, setFeedback] = useState(currentFeedback ?? "");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSugerida, setAiSugerida] = useState(false);

  async function sugerirComIA() {
    setAiError(null);
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(typeof data.error === "string" ? data.error : "Falha ao sugerir nota.");
        return;
      }
      setGrade(String(data.grade));
      setFeedback(data.feedback);
      setAiSugerida(true);
    } catch {
      setAiError("Falha de rede ao chamar a IA.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      {/* Entrega do aluno */}
      {isCode ? (
        <div className="overflow-hidden rounded-2xl border border-border">
          <MonacoEditor
            height="480px"
            language={monacoLanguage}
            value={code ?? ""}
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
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Entrega do aluno
          </h2>
          {submissionLink ? (
            <a
              href={submissionLink}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm text-primary underline"
            >
              {submissionLink}
            </a>
          ) : null}
          {responseText ? (
            <p className="whitespace-pre-wrap rounded-lg border border-border bg-background/40 p-3 text-sm">
              {responseText}
            </p>
          ) : null}
          {!submissionLink && !responseText && (
            <p className="text-sm text-muted-foreground">
              O aluno ainda não enviou a entrega.
            </p>
          )}
        </div>
      )}

      {/* Formulário de correção */}
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="submission_id" value={submissionId} />

        {/* Sugestão de nota + feedback por IA — o professor confirma/edita */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-primary">✨ Correção assistida por IA</span>
            <Button type="button" variant="secondary" onClick={sugerirComIA} disabled={aiLoading}>
              {aiLoading ? "Analisando…" : "Sugerir nota + feedback"}
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            A IA sugere uma nota e um feedback com base na entrega. Você revisa e ajusta antes de salvar.
          </p>
          {aiSugerida && (
            <p className="mt-2 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">
              💡 Sugestão preenchida abaixo — confira e edite se necessário.
            </p>
          )}
          {aiError && (
            <p className="mt-2 rounded-md border border-danger/40 bg-danger/10 px-2 py-1 text-xs text-danger">
              {aiError}
            </p>
          )}
        </div>

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
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
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
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
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

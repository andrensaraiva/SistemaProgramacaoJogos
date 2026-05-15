"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type {
  Exercise,
  RunResult,
  SampleTest,
  SubmissionResult,
} from "@/lib/exercises/types";

import { submitSolution } from "./actions";

// Monaco é pesado e usa APIs de browser — só carrega no cliente.
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[420px] place-items-center rounded-md border border-border bg-muted text-sm text-muted-foreground">
        Carregando editor…
      </div>
    ),
  },
);

const MONACO_LANGUAGE: Record<Exercise["language"], string> = {
  csharp: "csharp",
  python: "python",
  javascript: "javascript",
};

type Props = {
  exercise: Exercise;
  sampleTests: SampleTest[];
};

export function Workbench({ exercise, sampleTests }: Props) {
  const [code, setCode] = useState(exercise.starter_code);
  const [stdin, setStdin] = useState(sampleTests[0]?.stdin ?? "");
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [submission, setSubmission] = useState<SubmissionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [running, startRun] = useTransition();
  const [submitting, startSubmit] = useTransition();

  function handleTest() {
    setErrorMsg(null);
    setSubmission(null);
    startRun(async () => {
      try {
        const res = await fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: exercise.language,
            code,
            stdin,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setErrorMsg(
            typeof err.error === "string"
              ? err.error
              : `Erro ${res.status} ao executar`,
          );
          return;
        }
        setRunResult((await res.json()) as RunResult);
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : "Falha de rede ao executar",
        );
      }
    });
  }

  function handleSubmit() {
    setErrorMsg(null);
    setRunResult(null);
    startSubmit(async () => {
      const result = await submitSolution(exercise.id, code);
      setSubmission(result);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      {/* Enunciado */}
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {exercise.language} · {exercise.difficulty} · {exercise.xp_reward}{" "}
            XP
          </div>
          <h1 className="mt-1 text-2xl font-bold">{exercise.title}</h1>
        </div>
        <div className="whitespace-pre-wrap rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed">
          {exercise.description}
        </div>

        {sampleTests.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-sm font-semibold">
              Casos de teste visíveis ({sampleTests.length})
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {sampleTests.map((t) => (
                <div key={t.id} className="text-xs">
                  <div className="font-medium text-muted-foreground">
                    Caso #{t.ord}
                  </div>
                  <div className="mt-1 grid gap-2 sm:grid-cols-2">
                    <Block label="stdin" value={t.stdin || "(vazio)"} />
                    <Block label="esperado" value={t.expected_stdout} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Pode haver casos ocultos rodados na submissão.
            </p>
          </div>
        )}
      </div>

      {/* Editor + execução */}
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-2xl border border-border">
          <MonacoEditor
            height="420px"
            language={MONACO_LANGUAGE[exercise.language]}
            value={code}
            onChange={(v) => setCode(v ?? "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              tabSize: 4,
              automaticLayout: true,
              scrollBeyondLastLine: false,
            }}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="stdin pra teste rápido (uma entrada por linha)"
            rows={2}
            className="rounded-md border border-input bg-background p-2 font-mono text-xs"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleTest}
            disabled={running || submitting}
          >
            {running ? "Rodando…" : "Testar"}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={running || submitting}
          >
            {submitting ? "Enviando…" : "Enviar"}
          </Button>
        </div>

        {errorMsg && (
          <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            {errorMsg}
          </div>
        )}

        {runResult && <RunOutput result={runResult} />}

        {submission && <SubmissionOutput result={submission} />}
      </div>
    </div>
  );
}

function Block({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <pre className="mt-1 whitespace-pre-wrap rounded bg-muted p-2 font-mono text-xs">
        {value}
      </pre>
    </div>
  );
}

function RunOutput({ result }: { result: RunResult }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-xs">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        Resultado da execução
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            result.exit_code === 0
              ? "bg-success/15 text-success"
              : "bg-danger/15 text-danger"
          }`}
        >
          exit {result.exit_code}
          {result.timed_out ? " · timeout" : ""}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Block label="stdout" value={result.stdout || "(vazio)"} />
        <Block label="stderr" value={result.stderr || "(vazio)"} />
      </div>
    </div>
  );
}

function SubmissionOutput({ result }: { result: SubmissionResult }) {
  if (!result.ok) {
    return (
      <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
        {result.message}
      </div>
    );
  }

  const passed = result.status === "aprovado";
  return (
    <div
      className={`rounded-2xl border p-4 text-sm ${
        passed
          ? "border-success/40 bg-success/10"
          : "border-warning/40 bg-warning/10"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">
          {passed ? "✅ Aprovado!" : "⚠️ Reprovado"}
        </div>
        <div className="text-xs">
          {result.passed} / {result.total} casos
          {result.xp_earned > 0 && ` · +${result.xp_earned} XP`}
        </div>
      </div>
      {result.first_fail && (
        <div className="mt-3 text-xs">
          <div className="font-medium">
            Falhou no caso #{result.first_fail.ord}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Block label="stdin" value={result.first_fail.stdin || "(vazio)"} />
            <Block label="esperado" value={result.first_fail.expected} />
            <Block label="seu stdout" value={result.first_fail.got} />
            {result.first_fail.stderr && (
              <Block label="stderr" value={result.first_fail.stderr} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

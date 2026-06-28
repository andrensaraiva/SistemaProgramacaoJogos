"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useTransition } from "react";

import { RewardToast, type Reward } from "@/components/reward-toast";
import { Button } from "@/components/ui/button";
import type {
  Exercise,
  RunResult,
  SampleTest,
  SubmissionResult,
} from "@/lib/exercises/types";

import { generateSimilarExercise, submitSolution } from "./actions";

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

const BADGE_LABELS: Record<string, string> = {
  first_green: "Primeira Vitoria",
  no_paste: "Mao Propria",
  streak_7: "Semana Consistente",
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
  const [reward, setReward] = useState<Reward | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [extraMsg, setExtraMsg] = useState<string | null>(null);
  const [running, startRun] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const [generatingExtra, startGenerateExtra] = useTransition();
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, startAi] = useTransition();
  const firstEditAt = useRef<number | null>(null);
  const pasteEventCount = useRef(0);
  const keystrokeCount = useRef(0);

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
      const result = await submitSolution(exercise.id, code, {
        paste_event_count: pasteEventCount.current,
        keystroke_count: keystrokeCount.current,
        time_to_solve_ms:
          firstEditAt.current === null ? null : Date.now() - firstEditAt.current,
      });
      setSubmission(result);
      // Aprovou → comemora com toast de recompensa (XP + conquistas).
      if (result.ok && result.status === "aprovado") {
        setReward({
          xp: result.xp_earned,
          badges: result.badges_awarded.map((id) => ({
            id,
            label: BADGE_LABELS[id] ?? id,
          })),
        });
      }
    });
  }

  function handleCodeChange(value: string | undefined) {
    if (firstEditAt.current === null) {
      firstEditAt.current = Date.now();
    }
    keystrokeCount.current += 1;
    setCode(value ?? "");
  }

  function handleAssist(mode: "explain" | "hint") {
    setAiText(null);
    // Junta o melhor contexto de erro disponível (execução rápida ou submissão).
    const fail =
      submission && submission.ok ? submission.first_fail : null;
    const stderr = fail?.stderr ?? runResult?.stderr ?? undefined;
    const stdout = fail?.got ?? runResult?.stdout ?? undefined;
    const expected = fail?.expected ?? undefined;
    startAi(async () => {
      try {
        const res = await fetch("/api/ai/assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            language: exercise.language_label ?? exercise.language,
            exerciseTitle: exercise.title,
            exerciseDescription: exercise.description,
            code,
            stderr,
            stdout,
            expected,
          }),
        });
        const data = await res.json();
        setAiText(
          res.ok
            ? data.text
            : typeof data.error === "string"
              ? data.error
              : "Não foi possível obter ajuda agora.",
        );
      } catch {
        setAiText("Falha de rede ao pedir ajuda à IA.");
      }
    });
  }

  function handleGenerateExtra() {
    setExtraMsg(null);
    startGenerateExtra(async () => {
      const result = await generateSimilarExercise(exercise.id);
      if (result && !result.ok) setExtraMsg(result.message);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <RewardToast reward={reward} onClose={() => setReward(null)} />
      {/* Enunciado */}
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {exercise.language_label ?? exercise.language} ·{" "}
            {exercise.difficulty} · {exercise.xp_reward} XP
          </div>
          <h1 className="mt-1 text-2xl font-bold">{exercise.title}</h1>
        </div>
        <div className="whitespace-pre-wrap rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed">
          {exercise.description}
        </div>

        {/* Exemplo do professor — referência opcional pro aluno */}
        {exercise.example && (
          <details className="group rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primary">
              <span className="transition-transform group-open:rotate-90">▶</span>
              💡 Exemplo do professor
            </summary>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-background/60 p-3 font-mono text-xs leading-relaxed">
              {exercise.example}
            </pre>
          </details>
        )}

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

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-sm font-semibold">Treino extra</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Gere um exercicio parecido para praticar sem mexer neste desafio.
          </p>
          <div className="mt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleGenerateExtra}
              disabled={generatingExtra}
            >
              {generatingExtra ? "Gerando..." : "Gerar exercicio extra"}
            </Button>
          </div>
          {extraMsg && (
            <div className="mt-3 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
              {extraMsg}
            </div>
          )}
        </div>
      </div>

      {/* Editor + execução */}
      <div className="flex flex-col gap-4">
        <div
          className="overflow-hidden rounded-2xl border border-border"
          onPasteCapture={() => {
            pasteEventCount.current += 1;
          }}
        >
          <MonacoEditor
            height="420px"
            language={exercise.monaco_language ?? exercise.language}
            value={code}
            onChange={handleCodeChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              tabSize: 4,
              automaticLayout: true,
              scrollBeyondLastLine: false,
              // Autocomplete mais rico
              quickSuggestions: true,
              suggestOnTriggerCharacters: true,
              wordBasedSuggestions: "currentDocument",
              tabCompletion: "on",
              parameterHints: { enabled: true },
              snippetSuggestions: "inline",
              bracketPairColorization: { enabled: true },
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

        {/* Tutor de IA — não entrega a resposta, só explica/dá dica */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
          <span className="text-xs font-semibold text-muted-foreground">
            Tutor IA:
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleAssist("hint")}
            disabled={aiLoading}
          >
            {aiLoading ? "Pensando…" : "💡 Dica"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleAssist("explain")}
            disabled={aiLoading}
          >
            🔍 Explicar erro
          </Button>
          <span className="text-[11px] text-muted-foreground">
            (a IA não dá a resposta pronta)
          </span>
        </div>

        {aiText && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Tutor IA
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">{aiText}</p>
          </div>
        )}

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
      {result.badges_awarded.length > 0 && (
        <div className="mt-3 rounded-xl border border-primary/40 bg-primary/10 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary">
            Nova conquista desbloqueada
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {result.badges_awarded.map((badgeId) => (
              <span
                key={badgeId}
                className="rounded-full border border-primary/30 bg-background px-3 py-1 text-xs font-medium text-foreground"
              >
                {BADGE_LABELS[badgeId] ?? badgeId}
              </span>
            ))}
          </div>
        </div>
      )}
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

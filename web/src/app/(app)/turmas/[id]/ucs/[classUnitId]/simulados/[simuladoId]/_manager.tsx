"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Badge, DIFFICULTY_LABEL, DIFFICULTY_TONE } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import {
  atualizarSimulado,
  definirQuestoesDoSimulado,
  obterOuCriarSimulado,
} from "@/lib/saep/actions";

type BankItem = {
  id: string;
  comando: string;
  difficulty: string;
  competency_code: string | null;
  object_code: string | null;
};
type Simulado = {
  id: string;
  title: string;
  description: string;
  time_limit_min: number | null;
  show_feedback: boolean;
};

export function SimuladoManager({
  assignmentId,
  assignmentTitle,
  simulado,
  bank,
  selectedIds,
  submittedCount,
}: {
  assignmentId: string;
  assignmentTitle: string;
  simulado: Simulado | null;
  bank: BankItem[];
  selectedIds: string[];
  submittedCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Estado de configuração.
  const [title, setTitle] = useState(simulado?.title ?? assignmentTitle);
  const [description, setDescription] = useState(simulado?.description ?? "");
  const [timeLimit, setTimeLimit] = useState(
    simulado?.time_limit_min ? String(simulado.time_limit_min) : "",
  );
  const [showFeedback, setShowFeedback] = useState(simulado?.show_feedback ?? true);

  // Seleção de questões.
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));

  // Caso o simulado ainda não exista (atividade criada pelo hub genérico).
  if (!simulado) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">{assignmentTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Simulado SAEP</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="mb-4 text-sm text-muted-foreground">
            Este simulado ainda não foi configurado. Clique para criar e começar a
            montar as questões.
          </p>
          {error && (
            <div className="mb-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await obterOuCriarSimulado(assignmentId);
                if (!res.ok) {
                  setError(res.message);
                  return;
                }
                router.refresh();
              })
            }
          >
            {pending ? "Criando..." : "Configurar simulado"}
          </Button>
        </div>
      </div>
    );
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function saveConfig() {
    setError(null);
    startTransition(async () => {
      const res = await atualizarSimulado(simulado!.id, {
        title,
        description,
        time_limit_min: timeLimit ? Number(timeLimit) : 0,
        show_feedback: showFeedback,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.refresh();
    });
  }

  function saveQuestions() {
    setError(null);
    // Mantém a ordem do banco para a seleção.
    const ordered = bank.filter((q) => selected.has(q.id)).map((q) => q.id);
    startTransition(async () => {
      const res = await definirQuestoesDoSimulado(simulado!.id, ordered);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{simulado.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Simulado SAEP · {selected.size} questão(ões) selecionada(s) ·{" "}
            {submittedCount} envio(s)
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Configuração */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Configuração</h2>
        <div className="flex flex-col gap-4">
          <Field label="Título" htmlFor="title">
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Descrição (opcional)" htmlFor="description">
            <textarea
              id="description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tempo limite (min, 0 = sem limite)" htmlFor="time">
              <Input
                id="time"
                type="number"
                min={0}
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
              />
            </Field>
            <label className="flex items-center gap-2 self-end text-sm">
              <input
                type="checkbox"
                checked={showFeedback}
                onChange={(e) => setShowFeedback(e.target.checked)}
              />
              Mostrar gabarito/justificativas após enviar
            </label>
          </div>
          <div>
            <Button type="button" onClick={saveConfig} disabled={pending}>
              {pending ? "Salvando..." : "Salvar configuração"}
            </Button>
          </div>
        </div>
      </section>

      {/* Montagem das questões */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Questões do simulado</h2>
          <Button type="button" onClick={saveQuestions} disabled={pending}>
            {pending ? "Salvando..." : "Salvar seleção"}
          </Button>
        </div>

        {bank.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Seu banco está vazio. Crie questões em{" "}
            <Link href="/saep/questoes" className="text-primary hover:underline">
              SAEP → Banco de questões
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {bank.map((q) => {
              const checked = selected.has(q.id);
              return (
                <label
                  key={q.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                    checked ? "border-primary bg-primary/5" : "border-border bg-background"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(q.id)}
                    className="mt-1"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{q.comando}</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge tone={DIFFICULTY_TONE[q.difficulty] ?? "neutral"}>
                        {DIFFICULTY_LABEL[q.difficulty] ?? q.difficulty}
                      </Badge>
                      {q.competency_code && <Badge tone="primary">{q.competency_code}</Badge>}
                      {q.object_code && <Badge tone="accent">Obj {q.object_code}</Badge>}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

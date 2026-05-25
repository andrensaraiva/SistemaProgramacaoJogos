"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "codequest.studentTour.completed";

const STEPS = [
  {
    title: "Entre na turma",
    text: "Use o codigo do professor para receber listas e acompanhar seu progresso.",
    href: "/turmas/entrar",
    action: "Abrir turmas",
  },
  {
    title: "Resolva exercicios",
    text: "Teste seu codigo no navegador e envie quando todos os casos visiveis passarem.",
    href: "/exercicios",
    action: "Ver exercicios",
  },
  {
    title: "Acompanhe XP",
    text: "Submissoes aprovadas liberam XP, conquistas, ranking e duelos X1.",
    href: "/ranking",
    action: "Ver ranking",
  },
];

export function StudentOnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const progress = useMemo(() => `${step + 1}/${STEPS.length}`, [step]);

  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY) !== "true") {
      const timeout = window.setTimeout(() => setOpen(true), 0);
      return () => window.clearTimeout(timeout);
    }
  }, []);

  function finish() {
    window.localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Primeiro acesso
          </span>
          <span className="text-xs text-muted-foreground">{progress}</span>
        </div>

        <h2 className="mt-4 text-2xl font-bold">{current.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{current.text}</p>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={finish}>
            Pular
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep((value) => value - 1)}
              >
                Voltar
              </Button>
            )}
            {isLastStep ? (
              <Link href={current.href} onClick={finish}>
                <Button>{current.action}</Button>
              </Link>
            ) : (
              <Button
                type="button"
                onClick={() => setStep((value) => value + 1)}
              >
                Proximo
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

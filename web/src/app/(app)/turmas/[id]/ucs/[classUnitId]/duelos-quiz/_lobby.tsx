"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { criarDueloQuiz, entrarNoDueloQuiz } from "@/lib/saep/duelo";

export function CriarEntrarDuelo({
  classId,
  classUnitId,
  bankCount,
}: {
  classId: string;
  classUnitId: string;
  bankCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [count, setCount] = useState("5");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canCreate = bankCount >= 3;

  function create() {
    setError(null);
    startTransition(async () => {
      const res = await criarDueloQuiz(classId, classUnitId, Number(count) || 5);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.refresh();
    });
  }

  function join() {
    setError(null);
    if (!code.trim()) {
      setError("Informe o código do duelo.");
      return;
    }
    startTransition(async () => {
      const res = await entrarNoDueloQuiz(code);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      if (res.id) router.push(`/turmas/${classId}/ucs/${classUnitId}/duelos-quiz/${res.id}`);
      else router.refresh();
    });
  }

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Criar duelo</h2>
        {canCreate ? (
          <div className="flex flex-col gap-3">
            <Field label="Número de questões (3 a 10)" htmlFor="count">
              <Input
                id="count"
                type="number"
                min={3}
                max={10}
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              As questões são sorteadas do banco da turma. Compartilhe o código gerado
              com o colega para ele entrar.
            </p>
            <div>
              <Button type="button" onClick={create} disabled={pending}>
                {pending ? "Criando..." : "Criar duelo"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            O banco de questões precisa de pelo menos 3 questões. Há {bankCount}.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Entrar com código</h2>
        <div className="flex flex-col gap-3">
          <Field label="Código do duelo" htmlFor="code">
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ex: a1b2c3d4"
              className="font-mono"
            />
          </Field>
          <div>
            <Button type="button" variant="secondary" onClick={join} disabled={pending}>
              {pending ? "Entrando..." : "Entrar no duelo"}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger md:col-span-2">
          {error}
        </div>
      )}
    </section>
  );
}

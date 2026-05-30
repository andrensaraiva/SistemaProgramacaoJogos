"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clonarPlanoDeEnsino,
  criarPlanoDeEnsino,
} from "@/lib/curriculum/actions";

type MyPlan = { id: string; title: string };
type OtherPlan = { id: string; title: string; author: string };

export function PlanosDaUc({
  ucId,
  myPlans,
  otherPlans,
}: {
  ucId: string;
  myPlans: MyPlan[];
  otherPlans: OtherPlan[];
}) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function criar() {
    setError(null);
    start(async () => {
      const res = await criarPlanoDeEnsino(ucId, title || "Meu plano de ensino");
      if (res && !res.ok) setError(res.message);
    });
  }
  function clonar(id: string) {
    setError(null);
    start(async () => {
      const res = await clonarPlanoDeEnsino(id);
      if (res && !res.ok) setError(res.message);
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Planos de ensino</h2>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">Meus planos</h3>
        {myPlans.length ? (
          <ul className="flex flex-col gap-2">
            {myPlans.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/planos/${p.id}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-4 py-2 text-sm hover:border-primary/40"
                >
                  <span className="font-medium">{p.title}</span>
                  <span className="text-xs text-primary">Editar →</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            Você ainda não tem um plano para esta UC.
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-end gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título do novo plano"
            className="max-w-xs"
          />
          <Button type="button" onClick={criar} disabled={pending}>
            {pending ? "Criando..." : "+ Criar plano de ensino"}
          </Button>
        </div>
      </div>

      {!!otherPlans.length && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Planos de colegas (clone para adaptar)
          </h3>
          <ul className="flex flex-col gap-2">
            {otherPlans.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-4 py-2 text-sm"
              >
                <span>
                  <span className="font-medium">{p.title}</span>{" "}
                  <span className="text-xs text-muted-foreground">
                    por {p.author}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => clonar(p.id)}
                  disabled={pending}
                >
                  Clonar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
    </section>
  );
}

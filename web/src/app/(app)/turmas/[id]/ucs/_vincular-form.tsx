"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { vincularUcNaTurma } from "@/lib/curriculum/actions";

type UcOption = { id: string; label: string };
type Plan = { id: string; title: string; uc_id: string };

const selectCls =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

export function VincularUcForm({
  classId,
  ucOptions,
  myPlans,
}: {
  classId: string;
  ucOptions: UcOption[];
  myPlans: Plan[];
}) {
  const [ucId, setUcId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const plansForUc = useMemo(
    () => myPlans.filter((p) => p.uc_id === ucId),
    [myPlans, ucId],
  );

  function action(formData: FormData) {
    setError(null);
    start(async () => {
      const res = await vincularUcNaTurma(classId, formData);
      if (!res.ok) setError(res.message);
      else setUcId("");
    });
  }

  if (!ucOptions.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma UC disponível. Importe um PPC em{" "}
        <Link href="/cursos/importar" className="underline">
          Cursos → Importar PPC
        </Link>
        .
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium">Unidade curricular</span>
          <select
            name="uc_id"
            value={ucId}
            onChange={(e) => setUcId(e.target.value)}
            required
            className={selectCls}
          >
            <option value="">Selecione...</option>
            {ucOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Série / ano</span>
          <input
            name="serie"
            placeholder="Ex: 3ª série"
            className={selectCls}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Plano de ensino (opcional)</span>
        <select name="teaching_plan_id" className={selectCls} disabled={!ucId}>
          <option value="">Sem plano</option>
          {plansForUc.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        {ucId && !plansForUc.length && (
          <span className="text-xs text-muted-foreground">
            Você ainda não tem um plano para esta UC. Crie um na página da UC.
          </span>
        )}
      </label>

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div>
        <Button type="submit" disabled={pending || !ucId}>
          {pending ? "Vinculando..." : "Vincular UC"}
        </Button>
      </div>
    </form>
  );
}

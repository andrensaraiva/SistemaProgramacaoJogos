"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Badge, DIFFICULTY_LABEL, DIFFICULTY_TONE } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export type ExercicioItem = {
  id: string;
  title: string;
  language: string;
  difficulty: string;
  xp_reward: number;
  solved: boolean;
};

type Filtro = "todos" | "pendentes" | "resolvidos";

export function ExerciciosList({
  exercises,
  showProgress = true,
}: {
  exercises: ExercicioItem[];
  showProgress?: boolean;
}) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [lang, setLang] = useState<string>("todas");

  const langs = useMemo(
    () => [...new Set(exercises.map((e) => e.language))].sort(),
    [exercises],
  );

  const resolvidos = exercises.filter((e) => e.solved).length;
  const total = exercises.length;
  const pct = total > 0 ? Math.round((resolvidos / total) * 100) : 0;

  const visiveis = exercises.filter((e) => {
    if (filtro === "pendentes" && e.solved) return false;
    if (filtro === "resolvidos" && !e.solved) return false;
    if (lang !== "todas" && e.language !== lang) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Barra de progresso geral — quantos exercícios você já dominou */}
      {showProgress && (
      <Card className="reveal-up bg-gradient-to-br from-primary/10 to-card">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Seu progresso</span>
          <span className="text-muted-foreground">
            {resolvidos} de {total} resolvidos
          </span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="xp-fill xp-grow h-full rounded-full"
            style={{ ["--xp-target" as string]: `${pct}%` }}
          />
        </div>
        {resolvidos === total && total > 0 && (
          <p className="mt-2 text-xs font-medium text-success">
            🏆 Você resolveu todos! Mandou muito bem.
          </p>
        )}
      </Card>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {(
            [
              ["todos", "Todos"],
              ["pendentes", "Pendentes"],
              ["resolvidos", "Resolvidos"],
            ] as [Filtro, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFiltro(key)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                filtro === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {langs.length > 1 && (
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="todas">Todas as linguagens</option>
            {langs.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Lista */}
      {visiveis.length === 0 ? (
        <Card className="text-center text-sm text-muted-foreground">
          Nenhum exercício neste filtro.
        </Card>
      ) : (
        <div className="grid gap-3">
          {visiveis.map((exercise) => (
            <Link key={exercise.id} href={`/exercicios/${exercise.id}`} className="group">
              <Card
                className={`flex items-center justify-between gap-4 transition-all group-hover:-translate-y-0.5 group-hover:shadow-md ${
                  exercise.solved
                    ? "border-success/40 bg-success/5"
                    : "group-hover:border-primary/50"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg ${
                      exercise.solved
                        ? "bg-success/20 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                    title={exercise.solved ? "Resolvido" : "Ainda não resolvido"}
                  >
                    {exercise.solved ? "✓" : "•"}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold group-hover:text-primary">
                      {exercise.title}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="uppercase">{exercise.language}</span>
                      <span>·</span>
                      <span className="font-medium text-foreground">⚡ {exercise.xp_reward} XP</span>
                    </div>
                  </div>
                </div>
                <Badge tone={DIFFICULTY_TONE[exercise.difficulty] ?? "neutral"}>
                  {DIFFICULTY_LABEL[exercise.difficulty] ?? exercise.difficulty}
                </Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

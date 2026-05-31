import Link from "next/link";

import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const DIFFICULTY_LABEL: Record<string, { label: string; className: string }> = {
  facil: { label: "Facil", className: "bg-success/15 text-success" },
  medio: { label: "Medio", className: "bg-warning/15 text-warning" },
  dificil: { label: "Dificil", className: "bg-danger/15 text-danger" },
  desafio: { label: "Desafio", className: "bg-primary/15 text-primary" },
};

export default async function ExerciciosPage() {
  const profile = await getProfile();
  const isProfessor = profile?.role === "professor" || profile?.role === "admin";
  const supabase = await createClient();

  const { data: exercises, error } = await supabase
    .from("exercises")
    .select("id, title, language, difficulty, xp_reward")
    .eq("is_public", true)
    .order("difficulty", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Exercicios</h1>
          <p className="mt-1 text-muted-foreground">
            Resolva pra ganhar XP e subir de nivel.
          </p>
        </div>
        {isProfessor && (
          <div className="flex gap-2">
            <Link
              href="/exercicios/novo"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/70"
            >
              + Novo exercício
            </Link>
            <Link
              href="/exercicios/gerar"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              Gerar com IA
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          Erro ao carregar exercicios: {error.message}
        </div>
      )}

      {!error && (exercises?.length ?? 0) === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold">Nenhum exercicio ainda</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Rode <code>npm run seed:demo</code> ou gere um exercicio com IA.
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {(exercises ?? []).map((exercise) => {
          const diff =
            DIFFICULTY_LABEL[exercise.difficulty] ?? DIFFICULTY_LABEL.facil;
          return (
            <Link
              key={exercise.id}
              href={`/exercicios/${exercise.id}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="min-w-0">
                <div className="text-lg font-semibold">{exercise.title}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="uppercase">{exercise.language}</span>
                  <span>-</span>
                  <span>{exercise.xp_reward} XP</span>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${diff.className}`}
              >
                {diff.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

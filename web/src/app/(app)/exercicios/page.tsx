import Link from "next/link";

import { verifySession } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const DIFFICULTY_LABEL: Record<string, { label: string; className: string }> = {
  facil: { label: "Fácil", className: "bg-success/15 text-success" },
  medio: { label: "Médio", className: "bg-warning/15 text-warning" },
  dificil: { label: "Difícil", className: "bg-danger/15 text-danger" },
  desafio: { label: "Desafio", className: "bg-primary/15 text-primary" },
};

export default async function ExerciciosPage() {
  await verifySession();
  const supabase = await createClient();

  const { data: exercises, error } = await supabase
    .from("exercises")
    .select("id, title, language, difficulty, xp_reward")
    .eq("is_public", true)
    .order("difficulty", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Exercícios</h1>
        <p className="mt-1 text-muted-foreground">
          Resolva pra ganhar XP e subir de nível.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          Erro ao carregar exercícios: {error.message}
        </div>
      )}

      {!error && (exercises?.length ?? 0) === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold">Nenhum exercício ainda</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Aplique o seed em <code>supabase/seed/0001_exercises.sql</code> no
            SQL Editor do Supabase pra popular 3 exercícios de exemplo.
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {(exercises ?? []).map((ex) => {
          const diff =
            DIFFICULTY_LABEL[ex.difficulty] ?? DIFFICULTY_LABEL.facil;
          return (
            <Link
              key={ex.id}
              href={`/exercicios/${ex.id}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="min-w-0">
                <div className="text-lg font-semibold">{ex.title}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="uppercase">{ex.language}</span>
                  <span>·</span>
                  <span>{ex.xp_reward} XP</span>
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

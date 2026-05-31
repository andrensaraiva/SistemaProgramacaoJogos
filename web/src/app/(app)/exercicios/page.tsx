import Link from "next/link";

import { Badge, DIFFICULTY_LABEL, DIFFICULTY_TONE } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

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
      <PageHeader
        title="Exercícios"
        description="Resolva pra ganhar XP e subir de nível."
        actions={
          isProfessor ? (
            <>
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
            </>
          ) : undefined
        }
      />

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          Erro ao carregar exercicios: {error.message}
        </div>
      )}

      {!error && (exercises?.length ?? 0) === 0 && (
        <EmptyState
          title="Nenhum exercício ainda"
          description={
            <>
              Rode <code>npm run seed:demo</code> ou gere um exercício com IA.
            </>
          }
        />
      )}

      <div className="grid gap-3">
        {(exercises ?? []).map((exercise) => (
          <Link key={exercise.id} href={`/exercicios/${exercise.id}`} className="group">
            <Card className="flex items-center justify-between gap-4 transition-colors group-hover:border-primary/50">
              <div className="min-w-0">
                <div className="text-lg font-semibold">{exercise.title}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="uppercase">{exercise.language}</span>
                  <span>·</span>
                  <span>{exercise.xp_reward} XP</span>
                </div>
              </div>
              <Badge tone={DIFFICULTY_TONE[exercise.difficulty] ?? "neutral"}>
                {DIFFICULTY_LABEL[exercise.difficulty] ?? exercise.difficulty}
              </Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

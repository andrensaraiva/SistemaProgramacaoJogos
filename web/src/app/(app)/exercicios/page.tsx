import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import { ExerciciosList, type ExercicioItem } from "./_list";

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

  // Quais o aluno já resolveu (submissão aprovada) — pra marcar ✓.
  let solvedIds = new Set<string>();
  if (profile && !isProfessor && (exercises?.length ?? 0) > 0) {
    const { data: aprovadas } = await supabase
      .from("submissions")
      .select("exercise_id")
      .eq("student_id", profile.id)
      .eq("status", "aprovado");
    solvedIds = new Set((aprovadas ?? []).map((s) => s.exercise_id));
  }

  const items: ExercicioItem[] = (exercises ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    language: e.language,
    difficulty: e.difficulty,
    xp_reward: e.xp_reward,
    solved: solvedIds.has(e.id),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Exercícios"
        description="Resolva pra ganhar XP e subir de nível."
        actions={
          isProfessor ? (
            <>
              <Link href="/exercicios/novo">
                <Button variant="secondary">+ Novo exercício</Button>
              </Link>
              <Link href="/exercicios/gerar">
                <Button>Gerar com IA</Button>
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

      {!error && items.length === 0 && (
        <EmptyState
          title="Nenhum exercício ainda"
          description={
            <>
              Rode <code>npm run seed:demo</code> ou gere um exercício com IA.
            </>
          }
        />
      )}

      {items.length > 0 && (
        <ExerciciosList exercises={items} showProgress={!isProfessor} />
      )}
    </div>
  );
}

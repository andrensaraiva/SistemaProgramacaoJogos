import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { getProfile } from "@/lib/auth/dal";
import { getUcOptions } from "@/lib/curriculum/units";
import { createClient } from "@/lib/supabase/server";

import { ExerciciosList, type ExercicioItem } from "./_list";
import { CatalogoExercicios, type CatalogoItem, type TurmaComListas } from "./_catalog";

export default async function ExerciciosPage() {
  const profile = await getProfile();
  const isProfessor = profile?.role === "professor" || profile?.role === "admin";
  const supabase = await createClient();

  // --- Professor/admin: catálogo compartilhado (exercícios de todos os colegas)
  if (isProfessor && profile) {
    return <CatalogoProfessor profileId={profile.id} />;
  }

  // --- Aluno: catálogo público com progresso (comportamento original)
  const { data: exercises, error } = await supabase
    .from("exercises")
    .select("id, title, language, difficulty, xp_reward")
    .eq("is_public", true)
    .order("difficulty", { ascending: true })
    .order("created_at", { ascending: true });

  let solvedIds = new Set<string>();
  if (profile && (exercises?.length ?? 0) > 0) {
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
              Rode <code>npm run seed:demo</code> ou peça ao professor.
            </>
          }
        />
      )}

      {items.length > 0 && <ExerciciosList exercises={items} showProgress />}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Catálogo do professor — exercícios de todos os colegas, catalogados.
// -----------------------------------------------------------------------------
async function CatalogoProfessor({ profileId }: { profileId: string }) {
  const supabase = await createClient();

  // Exercícios visíveis: públicos (de qualquer professor) + os meus não-públicos.
  const { data: exercises, error } = await supabase
    .from("exercises")
    .select(
      "id, title, language, difficulty, xp_reward, exercise_type, is_public, is_exam_suitable, author_id, author:profiles!author_id(display_name)",
    )
    .or(`is_public.eq.true,author_id.eq.${profileId}`)
    .order("created_at", { ascending: false });

  // Vínculos exercício→UC de todos os exercícios listados (para chips + filtros).
  const ids = (exercises ?? []).map((e) => e.id);
  const { data: links } = ids.length
    ? await supabase.from("exercise_units").select("exercise_id, uc_id").in("exercise_id", ids)
    : { data: [] as { exercise_id: string; uc_id: string }[] };

  // Mapa uc_id → { curso, rótulo } para nomear os vínculos.
  const ucOptions = await getUcOptions(supabase);
  const ucById = new Map(ucOptions.map((u) => [u.id, u]));

  const ucsByExercise = new Map<string, string[]>();
  for (const l of links ?? []) {
    const arr = ucsByExercise.get(l.exercise_id) ?? [];
    arr.push(l.uc_id);
    ucsByExercise.set(l.exercise_id, arr);
  }

  const items: CatalogoItem[] = (exercises ?? []).map((e) => {
    const author = e.author as unknown as { display_name: string } | null;
    const ucIds = ucsByExercise.get(e.id) ?? [];
    return {
      id: e.id,
      title: e.title,
      language: e.language,
      difficulty: e.difficulty,
      xp_reward: e.xp_reward,
      exercise_type: e.exercise_type ?? "codigo",
      is_public: e.is_public,
      is_exam_suitable: e.is_exam_suitable ?? false,
      is_mine: e.author_id === profileId,
      author_name: author?.display_name ?? "—",
      uc_ids: ucIds,
      uc_labels: ucIds.map((id) => ucById.get(id)?.title ?? "UC").filter(Boolean),
      course_ids: [...new Set(ucIds.map((id) => ucById.get(id)?.courseId).filter((x): x is string => !!x))],
    };
  });

  // Turmas do professor + suas listas (para o fluxo "usar em uma turma").
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, assignments:assignments(id, title, kind)")
    .eq("owner_id", profileId)
    .order("name");

  const turmas: TurmaComListas[] = (classes ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    listas: ((c.assignments as { id: string; title: string; kind: string }[]) ?? [])
      .filter((a) => ["lista", "desafio", "prova"].includes(a.kind))
      .map((a) => ({ id: a.id, title: a.title, kind: a.kind })),
  }));

  const courseFilters = [
    ...new Map(ucOptions.map((u) => [u.courseId, { id: u.courseId, name: u.courseName }])).values(),
  ];
  const ucFilters = ucOptions.map((u) => ({ id: u.id, label: u.label }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Catálogo de exercícios"
        description="Exercícios de todos os professores. Filtre por curso, UC, dificuldade e prova — e aplique direto na sua turma."
        actions={
          <>
            <Link href="/exercicios/novo">
              <Button variant="secondary">+ Novo exercício</Button>
            </Link>
            <Link href="/exercicios/gerar">
              <Button>Gerar com IA</Button>
            </Link>
          </>
        }
      />

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          Erro ao carregar exercícios: {error.message}
        </div>
      )}

      {!error && items.length === 0 ? (
        <EmptyState
          title="Nenhum exercício no catálogo"
          description={
            <>
              Crie um <Link href="/exercicios/novo" className="text-primary underline">novo exercício</Link> ou gere com IA.
            </>
          }
        />
      ) : (
        <CatalogoExercicios
          items={items}
          turmas={turmas}
          courses={courseFilters}
          ucs={ucFilters}
        />
      )}
    </div>
  );
}

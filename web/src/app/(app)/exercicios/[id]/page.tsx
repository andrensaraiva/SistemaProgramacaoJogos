import { notFound } from "next/navigation";

import { verifySession } from "@/lib/auth/dal";
import { getLanguage } from "@/lib/exercises/languages";
import { createClient } from "@/lib/supabase/server";

import { Workbench } from "./_workbench";

export default async function ExercicioPage(
  props: PageProps<"/exercicios/[id]">,
) {
  await verifySession();
  const { id } = await props.params;

  const supabase = await createClient();

  const { data: exercise } = await supabase
    .from("exercises")
    .select(
      "id, title, description, starter_code, language, language_id, difficulty, xp_reward",
    )
    .eq("id", id)
    .single();

  if (!exercise) notFound();

  // Resolve metadados da linguagem (label amigável + modo do Monaco).
  // Prefere language_id (catálogo dinâmico); cai pro enum antigo se nulo.
  const langSlug = exercise.language_id ?? exercise.language;
  const lang = await getLanguage(langSlug);
  const exerciseForClient = {
    ...exercise,
    language: langSlug,
    language_label: lang?.label ?? langSlug,
    monaco_language: lang?.monaco_language ?? langSlug,
  };

  // RLS já filtra os ocultos, mas filtramos explicitamente pra garantir.
  const { data: sampleTests } = await supabase
    .from("exercise_tests")
    .select("id, ord, stdin, expected_stdout, weight")
    .eq("exercise_id", id)
    .eq("is_hidden", false)
    .order("ord", { ascending: true });

  return (
    <Workbench exercise={exerciseForClient} sampleTests={sampleTests ?? []} />
  );
}

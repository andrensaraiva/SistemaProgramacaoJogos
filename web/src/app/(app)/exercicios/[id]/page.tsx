import { notFound } from "next/navigation";

import { verifySession } from "@/lib/auth/dal";
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
      "id, title, description, starter_code, language, difficulty, xp_reward",
    )
    .eq("id", id)
    .single();

  if (!exercise) notFound();

  // RLS já filtra os ocultos, mas filtramos explicitamente pra garantir.
  const { data: sampleTests } = await supabase
    .from("exercise_tests")
    .select("id, ord, stdin, expected_stdout, weight")
    .eq("exercise_id", id)
    .eq("is_hidden", false)
    .order("ord", { ascending: true });

  return <Workbench exercise={exercise} sampleTests={sampleTests ?? []} />;
}

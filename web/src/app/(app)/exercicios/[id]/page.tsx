import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { verifySession } from "@/lib/auth/dal";
import { getLanguage } from "@/lib/exercises/languages";
import { createClient } from "@/lib/supabase/server";

import { Workbench } from "./_workbench";

const TIPO_LABEL: Record<string, string> = {
  apresentacao: "Apresentação (entrega de link)",
  modelo_resposta: "Modelo de resposta",
};

export default async function ExercicioPage(
  props: PageProps<"/exercicios/[id]">,
) {
  await verifySession();
  const { id } = await props.params;

  const supabase = await createClient();

  const { data: exercise } = await supabase
    .from("exercises")
    .select(
      "id, title, description, starter_code, language, language_id, difficulty, xp_reward, exercise_type, is_group, response_template",
    )
    .eq("id", id)
    .single();

  if (!exercise) notFound();

  // Exercícios não-código: visão de leitura. A entrega é feita dentro de uma
  // lista da turma (turmas/[id]/listas/[lid]), onde há o contexto do assignment.
  if (exercise.exercise_type && exercise.exercise_type !== "codigo") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title={exercise.title}
          description={TIPO_LABEL[exercise.exercise_type]}
          actions={
            exercise.is_group ? <StatusBadge label="Trabalho em grupo" tone="info" /> : undefined
          }
        />
        <Card>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Enunciado
          </h2>
          <p className="whitespace-pre-line text-sm">{exercise.description}</p>
        </Card>
        {exercise.response_template && (
          <Card>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Modelo de resposta
            </h2>
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {exercise.response_template}
            </p>
          </Card>
        )}
        <p className="text-sm text-muted-foreground">
          A entrega deste exercício é feita pela sua turma, na lista em que ele
          foi atribuído.
        </p>
      </div>
    );
  }

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

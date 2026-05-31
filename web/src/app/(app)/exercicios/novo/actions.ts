"use server";

import { redirect } from "next/navigation";
import * as z from "zod";

import { getProfile } from "@/lib/auth/dal";
import { getEnabledLanguages } from "@/lib/exercises/languages";
import { createAdminClient } from "@/lib/supabase/admin";

// Criação MANUAL de exercício pelo professor — suporta os três tipos:
// código (com testes), apresentação (entrega de link) e modelo de resposta.

const NovoSchema = z.object({
  title: z.string().trim().min(3, "Título muito curto").max(200),
  description: z.string().trim().min(5, "Descreva o enunciado").max(8000),
  exercise_type: z.enum(["codigo", "apresentacao", "modelo_resposta"]),
  is_group: z.coerce.boolean().default(false),
  difficulty: z.enum(["facil", "medio", "dificil", "desafio"]),
  xp_reward: z.coerce.number().int().min(0).max(200),
  is_public: z.coerce.boolean().default(true),
  // código
  language_id: z.string().trim().optional().default(""),
  starter_code: z.string().optional().default(""),
  // modelo de resposta
  response_template: z.string().max(8000).optional().default(""),
});

export type NovoExercicioState =
  | { errors?: Record<string, string[]>; message?: string }
  | undefined;

export async function criarExercicioManual(
  _prev: NovoExercicioState,
  formData: FormData,
): Promise<NovoExercicioState> {
  const profile = await getProfile();
  const isProfessor = profile?.role === "professor" || profile?.role === "admin";
  if (!profile || !isProfessor) {
    return { message: "Apenas professores podem criar exercícios." };
  }

  const parsed = NovoSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    exercise_type: formData.get("exercise_type"),
    is_group: formData.get("is_group") === "on",
    difficulty: formData.get("difficulty"),
    xp_reward: formData.get("xp_reward"),
    is_public: formData.get("is_public") === "on",
    language_id: formData.get("language_id") ?? "",
    starter_code: formData.get("starter_code") ?? "",
    response_template: formData.get("response_template") ?? "",
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;

  // Validações específicas do tipo código.
  let languageId: string | null = null;
  if (d.exercise_type === "codigo") {
    const langs = await getEnabledLanguages();
    const lang = langs.find((l) => l.id === d.language_id);
    if (!lang) {
      return { errors: { language_id: ["Escolha uma linguagem válida."] } };
    }
    languageId = lang.id;
  }

  const admin = createAdminClient();
  const { data: exercise, error } = await admin
    .from("exercises")
    .insert({
      author_id: profile.id,
      title: d.title,
      description: d.description,
      starter_code: d.exercise_type === "codigo" ? d.starter_code || "" : "",
      language: d.exercise_type === "codigo" ? "csharp" : "csharp", // legado; usa language_id
      language_id: languageId,
      difficulty: d.difficulty,
      xp_reward: d.xp_reward,
      is_public: d.is_public,
      exercise_type: d.exercise_type,
      is_group: d.is_group,
      response_template:
        d.exercise_type === "modelo_resposta" ? d.response_template || null : null,
    })
    .select("id")
    .single();

  if (error || !exercise) {
    return { message: error?.message ?? "Não foi possível criar o exercício." };
  }

  redirect(`/exercicios/${exercise.id}`);
}

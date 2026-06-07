"use server";

import { redirect } from "next/navigation";
import * as z from "zod";

import { getProfile } from "@/lib/auth/dal";
import { getEnabledLanguages } from "@/lib/exercises/languages";
import { createAdminClient } from "@/lib/supabase/admin";
import { ferramentaHabilitada, isCreativeKind } from "@/lib/canvas/tools";
import { DEFAULT_CONFIG, type CreativeKind } from "@/lib/canvas/types";
import { getInstitutionSettings } from "@/lib/reports/settings";

// Criação MANUAL de exercício pelo professor — suporta código, apresentação,
// modelo de resposta e os 3 tipos criativos (pixel/vetor/arte digital).

const NovoSchema = z.object({
  title: z.string().trim().min(3, "Título muito curto").max(200),
  description: z.string().trim().min(5, "Descreva o enunciado").max(8000),
  exercise_type: z.enum([
    "codigo",
    "apresentacao",
    "modelo_resposta",
    "pixel_art",
    "vetor",
    "arte_digital",
    "blocos",
  ]),
  is_group: z.coerce.boolean().default(false),
  difficulty: z.enum(["facil", "medio", "dificil", "desafio"]),
  xp_reward: z.coerce.number().int().min(0).max(200),
  is_public: z.coerce.boolean().default(true),
  // código
  language_id: z.string().trim().optional().default(""),
  starter_code: z.string().optional().default(""),
  // modelo de resposta
  response_template: z.string().max(8000).optional().default(""),
  // criativos
  canvas_width: z.coerce.number().int().min(8).max(2048).optional(),
  canvas_height: z.coerce.number().int().min(8).max(2048).optional(),
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
    canvas_width: formData.get("canvas_width") ?? undefined,
    canvas_height: formData.get("canvas_height") ?? undefined,
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

  // Governança: tipo criativo só se a ferramenta estiver ligada na instituição.
  let canvasConfig: { width: number; height: number; palette?: string[] } | null = null;
  if (isCreativeKind(d.exercise_type)) {
    const { tools } = await getInstitutionSettings();
    if (!ferramentaHabilitada(d.exercise_type, tools)) {
      return { message: "Esta ferramenta está desativada pela administração." };
    }
    const base = DEFAULT_CONFIG[d.exercise_type as CreativeKind];
    canvasConfig = {
      width: d.canvas_width ?? base.width,
      height: d.canvas_height ?? base.height,
      palette: base.palette,
    };
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
      canvas_config: canvasConfig,
    })
    .select("id")
    .single();

  if (error || !exercise) {
    return { message: error?.message ?? "Não foi possível criar o exercício." };
  }

  redirect(`/exercicios/${exercise.id}`);
}

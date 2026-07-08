"use server";

import { redirect } from "next/navigation";
import * as z from "zod";

import {
  ACTIVITY_KINDS,
  activityMeta,
  isCodeKind,
  isCreativeKind,
} from "@/lib/activities/registry";
import { getProfile } from "@/lib/auth/dal";
import { getEnabledLanguages } from "@/lib/exercises/languages";
import { createAdminClient } from "@/lib/supabase/admin";
import { ferramentaHabilitada } from "@/lib/canvas/tools";
import { DEFAULT_CONFIG, type CreativeKind } from "@/lib/canvas/types";
import { getInstitutionSettings } from "@/lib/reports/settings";

// Criação MANUAL de exercício pelo professor — suporta código, apresentação,
// modelo de resposta e os 3 tipos criativos (pixel/vetor/arte digital).

const NovoSchema = z.object({
  title: z.string().trim().min(3, "Título muito curto").max(200),
  description: z.string().trim().min(5, "Descreva o enunciado").max(8000),
  exercise_type: z.enum(ACTIVITY_KINDS),
  is_group: z.coerce.boolean().default(false),
  difficulty: z.enum(["facil", "medio", "dificil", "desafio"]),
  xp_reward: z.coerce.number().int().min(0).max(200),
  is_public: z.coerce.boolean().default(true),
  is_exam_suitable: z.coerce.boolean().default(false),
  uc_ids: z.array(z.string().uuid()).default([]),
  // código
  language_id: z.string().trim().optional().default(""),
  starter_code: z.string().optional().default(""),
  // exemplo do professor (visível ao aluno)
  example: z.string().max(8000).optional().default(""),
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
    is_exam_suitable: formData.get("is_exam_suitable") === "on",
    uc_ids: formData.getAll("uc_ids").filter((v): v is string => typeof v === "string"),
    language_id: formData.get("language_id") ?? "",
    starter_code: formData.get("starter_code") ?? "",
    example: formData.get("example") ?? "",
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
  if (isCodeKind(d.exercise_type)) {
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
      starter_code: isCodeKind(d.exercise_type) ? d.starter_code || "" : "",
      language: "csharp", // legado; a linguagem real vem de language_id
      language_id: languageId,
      difficulty: d.difficulty,
      xp_reward: d.xp_reward,
      is_public: d.is_public,
      is_exam_suitable: d.is_exam_suitable,
      exercise_type: d.exercise_type,
      is_group: d.is_group,
      example: d.example.trim() || null,
      response_template:
        activityMeta(d.exercise_type).deliveryInput === "text"
          ? d.response_template || null
          : null,
      canvas_config: canvasConfig,
    })
    .select("id")
    .single();

  if (error || !exercise) {
    return { message: error?.message ?? "Não foi possível criar o exercício." };
  }

  // Catalogação: vincula o exercício às UC(s) escolhidas (N:N). Não bloqueia a
  // criação se falhar — o professor pode revincular depois.
  if (d.uc_ids.length > 0) {
    await admin.from("exercise_units").insert(
      d.uc_ids.map((uc_id) => ({ exercise_id: exercise.id, uc_id })),
    );
  }

  redirect(`/exercicios/${exercise.id}`);
}

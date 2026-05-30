"use server";

import { redirect } from "next/navigation";
import * as z from "zod";

import { getProfile } from "@/lib/auth/dal";
import { aiCacheKey, readAiCache, writeAiCache } from "@/lib/ai/cache";
import { generateCsharpExercise } from "@/lib/ai/gemini";
import { createAdminClient } from "@/lib/supabase/admin";

const GenerateSchema = z.object({
  prompt: z.string().min(10, "Descreva melhor o exercicio").max(1000),
  difficulty: z.enum(["facil", "medio", "dificil", "desafio"]),
  xp_reward: z.coerce.number().int().min(5).max(200),
  is_public: z.coerce.boolean().default(true),
});

export type GenerateExerciseState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

export async function generateExerciseAction(
  _prev: GenerateExerciseState,
  formData: FormData,
): Promise<GenerateExerciseState> {
  const profile = await getProfile();
  const isProfessor = profile?.role === "professor" || profile?.role === "admin";

  if (!profile || !isProfessor) {
    return { message: "Apenas professores podem gerar exercicios." };
  }

  const parsed = GenerateSchema.safeParse({
    prompt: formData.get("prompt"),
    difficulty: formData.get("difficulty"),
    xp_reward: formData.get("xp_reward"),
    is_public: formData.get("is_public") === "on",
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const cacheKey = aiCacheKey({
    kind: "teacher_exercise",
    difficulty: parsed.data.difficulty,
    prompt: parsed.data.prompt,
  });

  let generated = await readAiCache(cacheKey);
  try {
    if (!generated) {
      generated = await generateCsharpExercise({
        prompt: parsed.data.prompt,
        difficulty: parsed.data.difficulty,
      });
      await writeAiCache({
        cacheKey,
        kind: "teacher_exercise",
        prompt: parsed.data.prompt,
        difficulty: parsed.data.difficulty,
        payload: generated,
        createdBy: profile.id,
      });
    }
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel gerar o exercicio.",
    };
  }

  const admin = createAdminClient();
  const { data: exercise, error: exerciseError } = await admin
    .from("exercises")
    .insert({
      author_id: profile.id,
      title: generated.title,
      description: generated.description,
      starter_code: generated.starter_code,
      solution: generated.solution,
      language: "csharp",
      language_id: "csharp",
      difficulty: parsed.data.difficulty,
      xp_reward: parsed.data.xp_reward,
      is_public: parsed.data.is_public,
      generated_by_ai: true,
    })
    .select("id")
    .single();

  if (exerciseError || !exercise) {
    return {
      message: exerciseError?.message ?? "Nao foi possivel salvar o exercicio.",
    };
  }

  const { error: testsError } = await admin.from("exercise_tests").insert(
    generated.tests.map((test, index) => ({
      exercise_id: exercise.id,
      ord: index + 1,
      stdin: test.stdin,
      expected_stdout: test.expected_stdout,
      is_hidden: test.is_hidden,
      weight: 1,
    })),
  );

  if (testsError) {
    await admin.from("exercises").delete().eq("id", exercise.id);
    return {
      message: `Exercicio gerado, mas falhou ao salvar testes: ${testsError.message}`,
    };
  }

  redirect(`/exercicios/${exercise.id}`);
}

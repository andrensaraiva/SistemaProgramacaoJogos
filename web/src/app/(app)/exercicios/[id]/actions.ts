"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { verifySession } from "@/lib/auth/dal";
import { aiCacheKey, readAiCache, writeAiCache } from "@/lib/ai/cache";
import { generateCsharpExercise } from "@/lib/ai/gemini";
import { compareOutputs, normalizeOutput } from "@/lib/exercises/judge";
import { executeCode } from "@/lib/exercises/piston";
import type {
  IntegritySignals,
  Language,
  SubmissionResult,
} from "@/lib/exercises/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Roda TODOS os casos de teste (incluindo ocultos) e persiste a submissao.
// O XP, level e badges sao processados pelo trigger do banco.
export async function submitSolution(
  exerciseId: string,
  code: string,
  integrity?: IntegritySignals,
): Promise<SubmissionResult> {
  if (!code || code.trim().length === 0) {
    return { ok: false, message: "O codigo esta vazio" };
  }

  const { user } = await verifySession();
  const admin = createAdminClient();

  const { data: exercise, error: exErr } = await admin
    .from("exercises")
    .select("id, language, language_id")
    .eq("id", exerciseId)
    .single();

  if (exErr || !exercise) {
    return { ok: false, message: "Exercicio nao encontrado" };
  }

  const { data: tests } = await admin
    .from("exercise_tests")
    .select("id, ord, stdin, expected_stdout, weight")
    .eq("exercise_id", exerciseId)
    .order("ord", { ascending: true });

  if (!tests || tests.length === 0) {
    return { ok: false, message: "Esse exercicio nao tem casos de teste" };
  }

  type FailDetail = {
    ord: number;
    stdin: string;
    expected: string;
    got: string;
    stderr: string;
  };

  let passed = 0;
  let firstFail: FailDetail | null = null;

  for (const t of tests) {
    let result;
    try {
      result = await executeCode({
        // Prefere o catálogo dinâmico; cai pro enum antigo se nulo.
        language: (exercise.language_id ?? exercise.language) as Language,
        code,
        stdin: t.stdin,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao executar";
      return { ok: false, message: `Erro no Piston: ${message}` };
    }

    const ok = compareOutputs(t.expected_stdout, result.stdout);
    if (ok) {
      passed++;
    } else if (!firstFail) {
      firstFail = {
        ord: t.ord,
        stdin: t.stdin,
        expected: normalizeOutput(t.expected_stdout),
        got: normalizeOutput(result.stdout),
        stderr: result.stderr,
      };
    }
  }

  const allPassed = passed === tests.length;
  const status: "aprovado" | "reprovado" = allPassed ? "aprovado" : "reprovado";
  const pasteCount = clampInteger(integrity?.paste_event_count ?? 0, 0, 999);
  const keystrokeCount = clampInteger(integrity?.keystroke_count ?? 0, 0, 99999);
  const timeToSolveMs =
    integrity?.time_to_solve_ms == null
      ? null
      : clampInteger(integrity.time_to_solve_ms, 0, 24 * 60 * 60 * 1000);
  const { score, reasons } = scoreSuspicion({
    paste_event_count: pasteCount,
    keystroke_count: keystrokeCount,
    time_to_solve_ms: timeToSolveMs,
  });

  const supa = await createClient();
  const { data: inserted, error: insertErr } = await supa
    .from("submissions")
    .insert({
      exercise_id: exerciseId,
      student_id: user.id,
      code,
      status,
      passed_count: passed,
      total_count: tests.length,
      stdout_first: firstFail?.got ?? null,
      stderr_first: firstFail?.stderr ?? null,
      paste_event_count: pasteCount,
      time_to_solve_ms: timeToSolveMs,
      keystroke_count: keystrokeCount,
      suspicion_score: score,
      suspicion_reasons: reasons,
    })
    .select("xp_awarded, badges_awarded")
    .single();

  if (insertErr) {
    return {
      ok: false,
      message: `Nao foi possivel salvar a submissao: ${insertErr.message}`,
    };
  }

  const xp_earned = inserted?.xp_awarded ?? 0;
  const badges_awarded = inserted?.badges_awarded ?? [];

  revalidatePath("/painel");
  revalidatePath("/ranking");
  revalidatePath(`/exercicios/${exerciseId}`);

  return {
    ok: true,
    status,
    passed,
    total: tests.length,
    xp_earned,
    badges_awarded,
    first_fail: firstFail,
  };
}

export async function generateSimilarExercise(exerciseId: string) {
  const { user } = await verifySession();
  const admin = createAdminClient();

  const { data: source, error: sourceError } = await admin
    .from("exercises")
    .select("title, description, difficulty, xp_reward")
    .eq("id", exerciseId)
    .single();

  if (sourceError || !source) {
    return { ok: false, message: "Exercicio base nao encontrado." };
  }

  const prompt = `Crie um exercicio extra similar a "${source.title}", mas com historia, numeros e contexto diferentes. Base: ${source.description}`;
  const cacheKey = aiCacheKey({
    kind: "student_extra",
    difficulty: source.difficulty,
    prompt,
  });

  let generated = await readAiCache(cacheKey);
  try {
    if (!generated) {
      generated = await generateCsharpExercise({
        difficulty: source.difficulty as "facil" | "medio" | "dificil" | "desafio",
        prompt,
      });
      await writeAiCache({
        cacheKey,
        kind: "student_extra",
        prompt,
        difficulty: source.difficulty,
        payload: generated,
        createdBy: user.id,
      });
    }
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel gerar exercicio extra.",
    };
  }

  const { data: exercise, error: insertError } = await admin
    .from("exercises")
    .insert({
      author_id: user.id,
      title: `Extra: ${generated.title}`,
      description: generated.description,
      starter_code: generated.starter_code,
      solution: generated.solution,
      language: "csharp",
      language_id: "csharp",
      difficulty: source.difficulty,
      xp_reward: Math.max(5, Math.round((source.xp_reward ?? 10) * 0.75)),
      is_public: true,
      generated_by_ai: true,
    })
    .select("id")
    .single();

  if (insertError || !exercise) {
    return { ok: false, message: "Nao foi possivel salvar o exercicio extra." };
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
    return { ok: false, message: "Nao foi possivel salvar os testes extras." };
  }

  revalidatePath("/exercicios");
  redirect(`/exercicios/${exercise.id}`);
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.round(value), min), max);
}

function scoreSuspicion(signals: IntegritySignals) {
  const reasons: string[] = [];
  let score = 0;

  if (signals.paste_event_count > 0) {
    score += Math.min(0.45 + signals.paste_event_count * 0.05, 0.65);
    reasons.push("paste_detected");
  }

  if (signals.time_to_solve_ms !== null && signals.time_to_solve_ms < 30000) {
    score += 0.25;
    reasons.push("very_fast_submission");
  }

  if (signals.keystroke_count > 0 && signals.keystroke_count < 5) {
    score += 0.15;
    reasons.push("low_edit_count");
  }

  return { score: Math.min(score, 1), reasons };
}

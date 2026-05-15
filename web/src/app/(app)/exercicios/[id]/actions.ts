"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { compareOutputs, normalizeOutput } from "@/lib/exercises/judge";
import { executeCode } from "@/lib/exercises/piston";
import type { Language, SubmissionResult } from "@/lib/exercises/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Roda TODOS os casos de teste (incluindo ocultos), persiste a submissão e,
// se passou em todos, dá XP/level pro aluno.
//
// Usa service_role pra ler testes ocultos e escrever em profiles.xp — RLS
// permitiria, mas seria bem mais verboso (uma policy por op).
export async function submitSolution(
  exerciseId: string,
  code: string,
): Promise<SubmissionResult> {
  if (!code || code.trim().length === 0) {
    return { ok: false, message: "O código está vazio" };
  }

  const { user } = await verifySession();
  const admin = createAdminClient();

  const { data: exercise, error: exErr } = await admin
    .from("exercises")
    .select("id, language, xp_reward")
    .eq("id", exerciseId)
    .single();

  if (exErr || !exercise) {
    return { ok: false, message: "Exercício não encontrado" };
  }

  const { data: tests } = await admin
    .from("exercise_tests")
    .select("id, ord, stdin, expected_stdout, weight")
    .eq("exercise_id", exerciseId)
    .order("ord", { ascending: true });

  if (!tests || tests.length === 0) {
    return { ok: false, message: "Esse exercício não tem casos de teste" };
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
        language: exercise.language as Language,
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

  // Persistir submissão como o próprio usuário (RLS já permite via "aluno cria submissoes")
  const supa = await createClient();
  await supa.from("submissions").insert({
    exercise_id: exerciseId,
    student_id: user.id,
    code,
    status,
    passed_count: passed,
    total_count: tests.length,
    stdout_first: firstFail?.got ?? null,
    stderr_first: firstFail?.stderr ?? null,
  });

  // Dar XP só se passou em tudo (regra de level: 100 XP por nível)
  let xp_earned = 0;
  if (allPassed) {
    xp_earned = exercise.xp_reward;

    const { data: profile } = await admin
      .from("profiles")
      .select("xp")
      .eq("id", user.id)
      .single();

    const newXp = (profile?.xp ?? 0) + xp_earned;
    const newLevel = Math.floor(newXp / 100) + 1;

    await admin
      .from("profiles")
      .update({ xp: newXp, level: newLevel })
      .eq("id", user.id);
  }

  revalidatePath("/painel");
  revalidatePath(`/exercicios/${exerciseId}`);

  return {
    ok: true,
    status,
    passed,
    total: tests.length,
    xp_earned,
    first_fail: firstFail,
  };
}

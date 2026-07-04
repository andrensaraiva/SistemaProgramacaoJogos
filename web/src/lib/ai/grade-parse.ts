// Parsing puro da sugestão da IA (sem server-only) — testável no Vitest.
// Separado de grade.ts (que importa server-only) para poder ser testado.

export type GradeSuggestion = {
  grade: number; // 0–10, uma casa
  feedback: string;
};

/** Limita a nota em [0,10] com uma casa decimal. */
export function clampGrade(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.min(10, Math.max(0, n)) * 10) / 10;
}

/** Extrai {grade, feedback} da resposta da IA, tolerando cercas de código. */
export function parseSuggestion(raw: string): GradeSuggestion | null {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1)) as {
      grade?: unknown;
      feedback?: unknown;
    };
    const grade = clampGrade(Number(obj.grade));
    const feedback = typeof obj.feedback === "string" ? obj.feedback.trim() : "";
    if (!feedback) return null;
    return { grade, feedback };
  } catch {
    return null;
  }
}

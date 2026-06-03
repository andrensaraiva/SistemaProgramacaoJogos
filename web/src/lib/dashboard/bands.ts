// Faixa de desempenho por % de acerto -> tom de cor. Pura e testável.
// Usada no dashboard SAEP (barras e células por aluno).

export type Band = "muted" | "danger" | "warning" | "success";

/** <50% vermelho, <70% amarelo, >=70% verde; null = cinza (sem dados). */
export function performanceBand(pct: number | null): Band {
  if (pct == null) return "muted";
  if (pct < 50) return "danger";
  if (pct < 70) return "warning";
  return "success";
}

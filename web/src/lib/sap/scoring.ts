// Regras puras do SAP prático (sem I/O) — testáveis isoladamente.
// A nota é a soma dos pontos dos itens marcados "Sim" (met=true) sobre o total.

export type ItemPoints = { id: string; points: number };

/**
 * Calcula a nota do SAP a partir dos itens da rubrica e das marcações.
 * - score: soma dos `points` dos itens com met=true.
 * - maxScore: soma de todos os `points`.
 * - pct: score/maxScore * 100 (null se maxScore<=0).
 */
export function computeSapScore(
  items: ItemPoints[],
  marks: Map<string, boolean>,
): { score: number; maxScore: number; pct: number | null } {
  let score = 0;
  let maxScore = 0;
  for (const item of items) {
    const p = Number.isFinite(item.points) ? item.points : 0;
    maxScore += p;
    if (marks.get(item.id) === true) score += p;
  }
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : null;
  // Evita -0 e ruído de ponto flutuante.
  return {
    score: Math.round(score * 100) / 100,
    maxScore: Math.round(maxScore * 100) / 100,
    pct,
  };
}

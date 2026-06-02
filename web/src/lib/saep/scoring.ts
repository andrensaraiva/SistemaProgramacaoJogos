// Regras puras do SAEP (sem I/O) — testáveis isoladamente.
// Correção de respostas, % de acerto, ELO e decisão de vencedor do duelo.

export const ELO_K = 32;

/** Deltas de ELO (winner ganha, loser perde o mesmo) dado o rating de cada um. */
export function elo(winnerRating: number, loserRating: number): {
  winnerDelta: number;
  loserDelta: number;
} {
  const expected = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const delta = Math.round(ELO_K * (1 - expected));
  return { winnerDelta: delta, loserDelta: -delta };
}

/**
 * Conta acertos comparando as respostas com o gabarito.
 * `correctByOption`: mapa option_id -> é correta?
 */
export function countCorrect(
  answers: { option_id: string }[],
  correctByOption: Map<string, boolean>,
): number {
  let correct = 0;
  for (const a of answers) {
    if (a.option_id && correctByOption.get(a.option_id) === true) correct += 1;
  }
  return correct;
}

/** % de acerto (0–100), arredondado. total<=0 retorna null. */
export function scorePercent(correct: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((correct / total) * 100);
}

/**
 * Decide o vencedor de um duelo de quiz: mais acertos vence; empate de acertos
 * decide pelo menor tempo; empate total retorna null (sem vencedor).
 * Retorna "a" | "b" | null.
 */
export function decideDuelWinner(
  a: { correct: number; ms: number | null },
  b: { correct: number; ms: number | null },
): "a" | "b" | null {
  if (a.correct !== b.correct) return a.correct > b.correct ? "a" : "b";
  const at = a.ms ?? Number.MAX_SAFE_INTEGER;
  const bt = b.ms ?? Number.MAX_SAFE_INTEGER;
  if (at !== bt) return at < bt ? "a" : "b";
  return null;
}

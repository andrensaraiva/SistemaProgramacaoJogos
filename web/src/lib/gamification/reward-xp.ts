// =============================================================================
// XP de recompensa por COMPLEXIDADE — lógica pura, testável.
// =============================================================================
// O aluno é recompensado em dois momentos, ambos escalando pela dificuldade:
//   1. ENTREGAR (participação): XP base pequeno × multiplicador da dificuldade.
//   2. SER AVALIADO (mérito): XP por nota = (nota/10) × XP cheio da dificuldade.
//
// Mantém a mesma escala de dificuldade do trigger de código (1.0/1.5/2.0/3.0),
// pra a recompensa ser coerente entre código e entrega.

export type Difficulty = "facil" | "medio" | "dificil" | "desafio";

/** Mesma escala do trigger de código (difficulty_multiplier no banco). */
export function difficultyMultiplier(diff: Difficulty | string): number {
  switch (diff) {
    case "facil":
      return 1.0;
    case "medio":
      return 1.5;
    case "dificil":
      return 2.0;
    case "desafio":
      return 3.0;
    default:
      return 1.0;
  }
}

/** XP base por COMPLETAR a entrega (participação), antes da nota. */
const XP_PARTICIPACAO_BASE = 10;
/** XP "cheio" de mérito por uma entrega nota 10, antes da dificuldade. */
const XP_MERITO_BASE = 30;

/**
 * XP de participação ao entregar (independe de nota). Recompensa o esforço de
 * fazer e enviar. Escala só pela dificuldade.
 */
export function participationXp(diff: Difficulty | string): number {
  return Math.round(XP_PARTICIPACAO_BASE * difficultyMultiplier(diff));
}

/**
 * XP de mérito ao receber a nota (0–10). Proporcional à nota e à dificuldade.
 * nota null/0 → 0. Não inclui o XP de participação (esse já foi dado na entrega).
 */
export function gradeXp(grade: number | null, diff: Difficulty | string): number {
  if (grade == null || grade <= 0) return 0;
  const clamped = Math.min(10, Math.max(0, grade));
  return Math.round((clamped / 10) * XP_MERITO_BASE * difficultyMultiplier(diff));
}

/** Nível a partir do XP total (mesma regra do banco: 100 XP por nível). */
export function levelFromXp(xp: number): number {
  return Math.floor(Math.max(0, xp) / 100) + 1;
}

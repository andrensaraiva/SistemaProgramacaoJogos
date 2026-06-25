// =============================================================================
// Streak (ofensiva diária) — lógica pura, testável.
// =============================================================================
// O streak conta dias CONSECUTIVOS em que o aluno apareceu. Trabalhamos com
// datas no formato YYYY-MM-DD (sem fuso), como no resto do projeto (calendário),
// pra não ter bug de meia-noite por timezone.

export type StreakState = {
  current: number;
  longest: number;
  /** Última data de atividade (YYYY-MM-DD) ou null se nunca apareceu. */
  lastActiveOn: string | null;
};

/** Data local do dispositivo como YYYY-MM-DD (sem deslocar por fuso). */
export function todayLocalISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Diferença em dias inteiros entre duas datas YYYY-MM-DD (b - a). */
export function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  const ua = Date.UTC(ya, ma - 1, da);
  const ub = Date.UTC(yb, mb - 1, db);
  return Math.round((ub - ua) / 86_400_000);
}

/**
 * Calcula o novo estado do streak quando o aluno aparece em `today`.
 * - mesmo dia da última atividade → sem mudança (não pontua duas vezes)
 * - exatamente o dia seguinte      → +1 na sequência
 * - pulou um ou mais dias (ou 1ª vez) → reinicia em 1
 * `longest` nunca diminui.
 */
export function applyVisit(state: StreakState, today: string): StreakState {
  const { current, longest, lastActiveOn } = state;

  if (lastActiveOn === today) return state;

  let next: number;
  if (lastActiveOn && daysBetween(lastActiveOn, today) === 1) {
    next = current + 1;
  } else {
    next = 1;
  }

  return {
    current: next,
    longest: Math.max(longest, next),
    lastActiveOn: today,
  };
}

/**
 * Streak "exibível": se o aluno não apareceu hoje nem ontem, a ofensiva já
 * esfriou — mostramos 0 mesmo antes de gravar a próxima visita. Evita exibir
 * uma sequência que na prática já quebrou.
 */
export function displayStreak(state: StreakState, today: string): number {
  if (!state.lastActiveOn) return 0;
  const gap = daysBetween(state.lastActiveOn, today);
  if (gap <= 0) return state.current; // apareceu hoje
  if (gap === 1) return state.current; // apareceu ontem, ainda vale hoje
  return 0; // esfriou
}

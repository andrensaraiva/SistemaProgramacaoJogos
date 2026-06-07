// Progresso de nível (puro, sem I/O) — testável. Fórmula do projeto:
// cada nível = 100 XP → level = floor(xp/100) + 1. Centraliza o cálculo que
// antes vivia espalhado (ex.: lib/saep/actions.ts).

export const XP_POR_NIVEL = 100;

export type ProgressoNivel = {
  level: number; // nível atual (>= 1)
  xpNoNivel: number; // XP acumulado dentro do nível atual (0..99)
  faltam: number; // XP que falta para o próximo nível (1..100)
  pct: number; // progresso no nível atual, 0..100
};

export function progressoNivel(xp: number): ProgressoNivel {
  const total = Math.max(0, Math.trunc(xp || 0));
  const level = Math.floor(total / XP_POR_NIVEL) + 1;
  const xpNoNivel = total % XP_POR_NIVEL;
  const faltam = XP_POR_NIVEL - xpNoNivel;
  const pct = Math.round((xpNoNivel / XP_POR_NIVEL) * 100);
  return { level, xpNoNivel, faltam, pct };
}

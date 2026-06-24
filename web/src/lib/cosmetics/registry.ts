// =============================================================================
// Registro central de COSMÉTICOS do perfil — recompensas por XP/nível.
// =============================================================================
// Estilo Discord: o aluno desbloqueia MOLDURAS (frame, ao redor do avatar) e
// BANNERS (faixa do topo do perfil) conforme sobe de nível, e equipa os que já
// liberou. Tudo é CSS (gradiente) — sem assets, sem Storage.
//
// Fonte única: adicionar um cosmético = uma entrada aqui (id + nível + estilo).
// O desbloqueio é derivado do nível do aluno (validado no servidor ao equipar).
// Pure TS (só `import type`) para poder ser usado por server e client.

import type { CSSProperties } from "react";

export type CosmeticKind = "frame" | "banner";

export type Cosmetic = {
  id: string;
  kind: CosmeticKind;
  name: string;
  /** Nível mínimo para desbloquear (1 = inicial, sempre liberado). */
  unlockLevel: number;
  /**
   * Para `frame`: estilo do anel ao redor do avatar (background do wrapper).
   * Para `banner`: estilo da faixa do topo (background).
   */
  style: CSSProperties;
};

export const FRAMES: Cosmetic[] = [
  { id: "default", kind: "frame", name: "Padrão", unlockLevel: 1, style: { background: "var(--border)" } },
  { id: "bronze", kind: "frame", name: "Bronze", unlockLevel: 2, style: { background: "linear-gradient(135deg,#cd7f32,#8c5a2b)" } },
  { id: "prata", kind: "frame", name: "Prata", unlockLevel: 4, style: { background: "linear-gradient(135deg,#e8e8e8,#9aa3ad)" } },
  { id: "ouro", kind: "frame", name: "Ouro", unlockLevel: 7, style: { background: "linear-gradient(135deg,#ffd86b,#e0a200)" } },
  { id: "esmeralda", kind: "frame", name: "Esmeralda", unlockLevel: 12, style: { background: "linear-gradient(135deg,#34d399,#0e7c5a)" } },
  { id: "lendaria", kind: "frame", name: "Lendária", unlockLevel: 20, style: { background: "conic-gradient(from 180deg,#f472b6,#a78bfa,#38bdf8,#34d399,#fbbf24,#f472b6)" } },
];

export const BANNERS: Cosmetic[] = [
  { id: "padrao", kind: "banner", name: "Padrão", unlockLevel: 1, style: { background: "linear-gradient(120deg,var(--muted),var(--card))" } },
  { id: "oceano", kind: "banner", name: "Oceano", unlockLevel: 2, style: { background: "linear-gradient(120deg,#0ea5e9,#1e3a8a)" } },
  { id: "por-do-sol", kind: "banner", name: "Pôr do sol", unlockLevel: 4, style: { background: "linear-gradient(120deg,#f97316,#db2777)" } },
  { id: "floresta", kind: "banner", name: "Floresta", unlockLevel: 7, style: { background: "linear-gradient(120deg,#15803d,#052e16)" } },
  { id: "nebulosa", kind: "banner", name: "Nebulosa", unlockLevel: 12, style: { background: "linear-gradient(120deg,#7c3aed,#2563eb,#0f172a)" } },
  { id: "aurora", kind: "banner", name: "Aurora", unlockLevel: 20, style: { background: "linear-gradient(120deg,#22d3ee,#a78bfa,#f472b6,#34d399)" } },
];

export const DEFAULT_FRAME_ID = "default";
export const DEFAULT_BANNER_ID = "padrao";

const CATALOG: Record<CosmeticKind, Cosmetic[]> = { frame: FRAMES, banner: BANNERS };
const DEFAULTS: Record<CosmeticKind, Cosmetic> = { frame: FRAMES[0], banner: BANNERS[0] };

/** Catálogo de um tipo (frame/banner), na ordem de desbloqueio. */
export function catalog(kind: CosmeticKind): Cosmetic[] {
  return CATALOG[kind];
}

/** Busca um cosmético por tipo+id; `null` se não existir. */
export function cosmeticById(kind: CosmeticKind, id: string | null | undefined): Cosmetic | null {
  if (!id) return null;
  return CATALOG[kind].find((c) => c.id === id) ?? null;
}

/** Moldura equipada (ou a padrão se nula/inválida). */
export function frameById(id: string | null | undefined): Cosmetic {
  return cosmeticById("frame", id) ?? DEFAULTS.frame;
}

/** Banner equipado (ou o padrão se nulo/inválido). */
export function bannerById(id: string | null | undefined): Cosmetic {
  return cosmeticById("banner", id) ?? DEFAULTS.banner;
}

/** O nível atual libera este cosmético? */
export function isUnlocked(level: number, c: Cosmetic): boolean {
  return level >= c.unlockLevel;
}

/** Quantos cosméticos de um tipo o aluno já desbloqueou. */
export function unlockedCount(level: number, kind: CosmeticKind): number {
  return CATALOG[kind].filter((c) => isUnlocked(level, c)).length;
}

/** Próximo cosmético a desbloquear (para dar uma "meta"); null se já tem tudo. */
export function nextUnlock(level: number, kind: CosmeticKind): Cosmetic | null {
  return CATALOG[kind].find((c) => !isUnlocked(level, c)) ?? null;
}

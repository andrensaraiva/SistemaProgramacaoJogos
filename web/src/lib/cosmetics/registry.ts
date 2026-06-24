// =============================================================================
// Registro central de COSMÉTICOS + economia de MOEDAS Celeste.
// =============================================================================
// Estilo Discord: o aluno ganha MOEDAS ao subir de nível e COMPRA cosméticos na
// loja (molduras, banners e skins de avatar), equipando o que já comprou. Tudo
// é CSS (gradiente) — sem assets, sem Storage.
//
// Fonte única: adicionar um cosmético = uma entrada aqui (id + preço + estilo).
// Saldo de moedas é DERIVADO do nível (coinsForLevel) — ver lib/cosmetics/coins.
// A compra é validada no servidor (lib/cosmetics/actions.ts).
//
// Pure TS (só `import type`) para uso em server e client.

import type { CSSProperties } from "react";

export type CosmeticKind = "frame" | "banner" | "avatar";

export type Cosmetic = {
  id: string;
  kind: CosmeticKind;
  name: string;
  /** Preço em moedas. 0 = grátis (item padrão, todo aluno já possui). */
  price: number;
  /** Nível mínimo para comprar (1 = sem trava; >1 = item de prestígio). */
  minLevel: number;
  /**
   * `frame`: estilo do anel ao redor do avatar.
   * `banner`: estilo da faixa do topo do perfil.
   * `avatar`: estilo de fundo do círculo do avatar.
   */
  style: CSSProperties;
};

export const FRAMES: Cosmetic[] = [
  { id: "default", kind: "frame", name: "Padrão", price: 0, minLevel: 1, style: { background: "var(--border)" } },
  { id: "bronze", kind: "frame", name: "Bronze", price: 60, minLevel: 1, style: { background: "linear-gradient(135deg,#cd7f32,#8c5a2b)" } },
  { id: "prata", kind: "frame", name: "Prata", price: 120, minLevel: 1, style: { background: "linear-gradient(135deg,#e8e8e8,#9aa3ad)" } },
  { id: "ouro", kind: "frame", name: "Ouro", price: 220, minLevel: 5, style: { background: "linear-gradient(135deg,#ffd86b,#e0a200)" } },
  { id: "esmeralda", kind: "frame", name: "Esmeralda", price: 350, minLevel: 8, style: { background: "linear-gradient(135deg,#34d399,#0e7c5a)" } },
  { id: "lendaria", kind: "frame", name: "Lendária", price: 600, minLevel: 15, style: { background: "conic-gradient(from 180deg,#f472b6,#a78bfa,#38bdf8,#34d399,#fbbf24,#f472b6)" } },
];

export const BANNERS: Cosmetic[] = [
  { id: "padrao", kind: "banner", name: "Padrão", price: 0, minLevel: 1, style: { background: "linear-gradient(120deg,var(--muted),var(--card))" } },
  { id: "oceano", kind: "banner", name: "Oceano", price: 60, minLevel: 1, style: { background: "linear-gradient(120deg,#0ea5e9,#1e3a8a)" } },
  { id: "por-do-sol", kind: "banner", name: "Pôr do sol", price: 120, minLevel: 1, style: { background: "linear-gradient(120deg,#f97316,#db2777)" } },
  { id: "floresta", kind: "banner", name: "Floresta", price: 220, minLevel: 5, style: { background: "linear-gradient(120deg,#15803d,#052e16)" } },
  { id: "nebulosa", kind: "banner", name: "Nebulosa", price: 350, minLevel: 8, style: { background: "linear-gradient(120deg,#7c3aed,#2563eb,#0f172a)" } },
  { id: "aurora", kind: "banner", name: "Aurora", price: 600, minLevel: 15, style: { background: "linear-gradient(120deg,#22d3ee,#a78bfa,#f472b6,#34d399)" } },
];

export const AVATARS: Cosmetic[] = [
  { id: "default", kind: "avatar", name: "Padrão", price: 0, minLevel: 1, style: { background: "color-mix(in srgb, var(--primary) 18%, transparent)", color: "var(--primary)" } },
  { id: "menta", kind: "avatar", name: "Menta", price: 80, minLevel: 1, style: { background: "linear-gradient(135deg,#5eead4,#0d9488)", color: "#03201c" } },
  { id: "coral", kind: "avatar", name: "Coral", price: 80, minLevel: 1, style: { background: "linear-gradient(135deg,#fb7185,#e11d48)", color: "#fff" } },
  { id: "ametista", kind: "avatar", name: "Ametista", price: 150, minLevel: 3, style: { background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" } },
  { id: "dourado", kind: "avatar", name: "Dourado", price: 300, minLevel: 10, style: { background: "linear-gradient(135deg,#fde68a,#d97706)", color: "#3b1d00" } },
  { id: "galaxia", kind: "avatar", name: "Galáxia", price: 450, minLevel: 15, style: { background: "conic-gradient(from 90deg,#1e1b4b,#7c3aed,#2563eb,#1e1b4b)", color: "#fff" } },
];

export const DEFAULT_FRAME_ID = "default";
export const DEFAULT_BANNER_ID = "padrao";
export const DEFAULT_AVATAR_ID = "default";

const CATALOG: Record<CosmeticKind, Cosmetic[]> = { frame: FRAMES, banner: BANNERS, avatar: AVATARS };
const DEFAULTS: Record<CosmeticKind, Cosmetic> = { frame: FRAMES[0], banner: BANNERS[0], avatar: AVATARS[0] };

export const COSMETIC_KINDS: CosmeticKind[] = ["frame", "banner", "avatar"];

/** Catálogo de um tipo (frame/banner/avatar), na ordem de preço. */
export function catalog(kind: CosmeticKind): Cosmetic[] {
  return CATALOG[kind];
}

/** Busca um cosmético por tipo+id; `null` se não existir. */
export function cosmeticById(kind: CosmeticKind, id: string | null | undefined): Cosmetic | null {
  if (!id) return null;
  return CATALOG[kind].find((c) => c.id === id) ?? null;
}

export function frameById(id: string | null | undefined): Cosmetic {
  return cosmeticById("frame", id) ?? DEFAULTS.frame;
}
export function bannerById(id: string | null | undefined): Cosmetic {
  return cosmeticById("banner", id) ?? DEFAULTS.banner;
}
export function avatarById(id: string | null | undefined): Cosmetic {
  return cosmeticById("avatar", id) ?? DEFAULTS.avatar;
}

/** Itens grátis (preço 0) que todo aluno já possui sem comprar. */
export function isFree(c: Cosmetic): boolean {
  return c.price === 0;
}

/** O nível atual permite comprar este item (atende a trava de prestígio)? */
export function meetsLevel(level: number, c: Cosmetic): boolean {
  return level >= c.minLevel;
}

/** Ids dos itens grátis de um tipo (sempre "possuídos"). */
export function freeIds(kind: CosmeticKind): string[] {
  return CATALOG[kind].filter(isFree).map((c) => c.id);
}

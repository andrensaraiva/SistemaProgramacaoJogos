import { describe, expect, it } from "vitest";

import {
  BANNERS,
  DEFAULT_BANNER_ID,
  DEFAULT_FRAME_ID,
  FRAMES,
  bannerById,
  catalog,
  cosmeticById,
  frameById,
  isUnlocked,
  nextUnlock,
  unlockedCount,
} from "./registry";

describe("cosmetics registry", () => {
  it("os padrões (nível 1) existem e são o primeiro item de cada catálogo", () => {
    expect(FRAMES[0].id).toBe(DEFAULT_FRAME_ID);
    expect(BANNERS[0].id).toBe(DEFAULT_BANNER_ID);
    expect(FRAMES[0].unlockLevel).toBe(1);
    expect(BANNERS[0].unlockLevel).toBe(1);
  });

  it("frameById/bannerById caem no padrão para id nulo/inválido", () => {
    expect(frameById(null).id).toBe(DEFAULT_FRAME_ID);
    expect(frameById("nao-existe").id).toBe(DEFAULT_FRAME_ID);
    expect(bannerById(undefined).id).toBe(DEFAULT_BANNER_ID);
    expect(bannerById("ouro").id).toBe(DEFAULT_BANNER_ID); // 'ouro' é frame, não banner
  });

  it("cosmeticById respeita o tipo", () => {
    expect(cosmeticById("frame", "ouro")?.kind).toBe("frame");
    expect(cosmeticById("banner", "ouro")).toBeNull();
  });

  it("isUnlocked compara com o nível", () => {
    const ouro = cosmeticById("frame", "ouro")!;
    expect(isUnlocked(ouro.unlockLevel - 1, ouro)).toBe(false);
    expect(isUnlocked(ouro.unlockLevel, ouro)).toBe(true);
    expect(isUnlocked(99, ouro)).toBe(true);
  });

  it("unlockedCount cresce com o nível e bate o catálogo no topo", () => {
    expect(unlockedCount(1, "frame")).toBe(1);
    expect(unlockedCount(1000, "frame")).toBe(FRAMES.length);
    expect(unlockedCount(1000, "banner")).toBe(BANNERS.length);
  });

  it("nextUnlock aponta o próximo bloqueado e é null quando tem tudo", () => {
    const prox = nextUnlock(1, "frame");
    expect(prox).not.toBeNull();
    expect(prox!.unlockLevel).toBeGreaterThan(1);
    expect(nextUnlock(1000, "frame")).toBeNull();
  });

  it("catálogos estão em ordem crescente de nível", () => {
    for (const kind of ["frame", "banner"] as const) {
      const niveis = catalog(kind).map((c) => c.unlockLevel);
      const ordenado = [...niveis].sort((a, b) => a - b);
      expect(niveis).toEqual(ordenado);
    }
  });
});

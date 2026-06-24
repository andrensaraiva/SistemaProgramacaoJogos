import { describe, expect, it } from "vitest";

import {
  AVATARS,
  BANNERS,
  COSMETIC_KINDS,
  DEFAULT_AVATAR_ID,
  DEFAULT_BANNER_ID,
  DEFAULT_FRAME_ID,
  FRAMES,
  avatarById,
  bannerById,
  catalog,
  cosmeticById,
  frameById,
  freeIds,
  isFree,
  meetsLevel,
} from "./registry";

describe("cosmetics registry", () => {
  it("cada tipo tem um item padrão grátis no nível 1", () => {
    expect(FRAMES[0].id).toBe(DEFAULT_FRAME_ID);
    expect(BANNERS[0].id).toBe(DEFAULT_BANNER_ID);
    expect(AVATARS[0].id).toBe(DEFAULT_AVATAR_ID);
    for (const kind of COSMETIC_KINDS) {
      const def = catalog(kind)[0];
      expect(def.price).toBe(0);
      expect(def.minLevel).toBe(1);
      expect(isFree(def)).toBe(true);
    }
  });

  it("fallbacks resolvem para o padrão quando id é nulo/inválido/de outro tipo", () => {
    expect(frameById(null).id).toBe(DEFAULT_FRAME_ID);
    expect(bannerById("nao-existe").id).toBe(DEFAULT_BANNER_ID);
    expect(avatarById(undefined).id).toBe(DEFAULT_AVATAR_ID);
    expect(bannerById("ouro").id).toBe(DEFAULT_BANNER_ID); // 'ouro' é frame
  });

  it("cosmeticById respeita o tipo", () => {
    expect(cosmeticById("frame", "ouro")?.kind).toBe("frame");
    expect(cosmeticById("banner", "ouro")).toBeNull();
    expect(cosmeticById("avatar", "galaxia")?.kind).toBe("avatar");
  });

  it("itens não-grátis têm preço positivo", () => {
    for (const kind of COSMETIC_KINDS) {
      for (const c of catalog(kind)) {
        if (!isFree(c)) expect(c.price).toBeGreaterThan(0);
      }
    }
  });

  it("meetsLevel respeita o nível mínimo", () => {
    const ouro = cosmeticById("frame", "ouro")!;
    expect(meetsLevel(ouro.minLevel - 1, ouro)).toBe(false);
    expect(meetsLevel(ouro.minLevel, ouro)).toBe(true);
  });

  it("freeIds lista só os itens grátis do tipo", () => {
    for (const kind of COSMETIC_KINDS) {
      const ids = freeIds(kind);
      expect(ids.length).toBeGreaterThanOrEqual(1);
      for (const id of ids) expect(isFree(cosmeticById(kind, id)!)).toBe(true);
    }
  });
});

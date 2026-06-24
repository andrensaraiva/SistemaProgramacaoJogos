import { describe, expect, it } from "vitest";

import {
  ACTIVITY_TYPES,
  BASE_ACTIVITY_TYPES,
  activityFamily,
  activityLabel,
  activityMeta,
  isCodeKind,
  isCreativeKind,
  isDeliveryKind,
} from "./registry";

describe("activity registry", () => {
  it("classifica cada tipo na família certa", () => {
    expect(activityFamily("codigo")).toBe("code");
    expect(activityFamily("apresentacao")).toBe("delivery");
    expect(activityFamily("modelo_resposta")).toBe("delivery");
    expect(activityFamily("pixel_art")).toBe("creative");
    expect(activityFamily("vetor")).toBe("creative");
    expect(activityFamily("arte_digital")).toBe("creative");
    expect(activityFamily("blocos")).toBe("creative");
  });

  it("trata tipo desconhecido/nulo como código (fallback)", () => {
    expect(activityFamily(null)).toBe("code");
    expect(activityFamily(undefined)).toBe("code");
    expect(activityFamily("tipo_que_nao_existe")).toBe("code");
    expect(isCodeKind(null)).toBe(true);
  });

  it("predicados de família são mutuamente exclusivos", () => {
    for (const meta of ACTIVITY_TYPES) {
      const flags = [
        isCodeKind(meta.kind),
        isCreativeKind(meta.kind),
        isDeliveryKind(meta.kind),
      ].filter(Boolean);
      expect(flags).toHaveLength(1);
    }
  });

  it("só código ganha XP/correção automática", () => {
    for (const meta of ACTIVITY_TYPES) {
      const ehCodigo = meta.family === "code";
      expect(meta.autoXp).toBe(ehCodigo);
      expect(meta.autoGraded).toBe(ehCodigo);
    }
  });

  it("entregas (delivery) definem o campo de entrada (link ou texto)", () => {
    expect(activityMeta("apresentacao").deliveryInput).toBe("link");
    expect(activityMeta("modelo_resposta").deliveryInput).toBe("text");
    // não-delivery não tem deliveryInput
    expect(activityMeta("codigo").deliveryInput).toBeUndefined();
    expect(activityMeta("pixel_art").deliveryInput).toBeUndefined();
  });

  it("os tipos base são exatamente os não-criativos", () => {
    expect(BASE_ACTIVITY_TYPES.every((a) => a.family !== "creative")).toBe(true);
    expect(BASE_ACTIVITY_TYPES.map((a) => a.kind)).toEqual([
      "codigo",
      "apresentacao",
      "modelo_resposta",
    ]);
  });

  it("expõe um rótulo amigável para todo tipo", () => {
    for (const meta of ACTIVITY_TYPES) {
      expect(activityLabel(meta.kind)).toBe(meta.label);
      expect(meta.label.length).toBeGreaterThan(0);
    }
  });
});

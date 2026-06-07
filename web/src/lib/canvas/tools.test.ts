import { describe, expect, it } from "vitest";

import {
  CREATIVE_TOOLS,
  ferramentaHabilitada,
  ferramentasHabilitadas,
  isCreativeKind,
} from "./tools";

const ALL_ON = { tool_pixel_art: true, tool_vetor: true, tool_arte_digital: true, tool_blocos: true };
const ALL_OFF = { tool_pixel_art: false, tool_vetor: false, tool_arte_digital: false, tool_blocos: false };

describe("registro de ferramentas criativas", () => {
  it("tem as 4 ferramentas (pixel, vetor, arte, blocos)", () => {
    expect(CREATIVE_TOOLS.map((t) => t.kind)).toEqual(["pixel_art", "vetor", "arte_digital", "blocos"]);
  });

  it("ferramentasHabilitadas filtra pelos toggles", () => {
    expect(ferramentasHabilitadas(ALL_ON)).toHaveLength(4);
    const semVetor = ferramentasHabilitadas({ ...ALL_ON, tool_vetor: false });
    expect(semVetor.map((t) => t.kind)).toEqual(["pixel_art", "arte_digital", "blocos"]);
    expect(ferramentasHabilitadas(ALL_OFF)).toHaveLength(0);
  });

  it("ferramentaHabilitada checa um tipo específico", () => {
    expect(ferramentaHabilitada("pixel_art", ALL_ON)).toBe(true);
    expect(ferramentaHabilitada("vetor", { ...ALL_ON, tool_vetor: false })).toBe(false);
    expect(ferramentaHabilitada("codigo", ALL_ON)).toBe(false); // não é criativo
  });

  it("isCreativeKind distingue criativos de não-criativos", () => {
    expect(isCreativeKind("pixel_art")).toBe(true);
    expect(isCreativeKind("arte_digital")).toBe(true);
    expect(isCreativeKind("codigo")).toBe(false);
    expect(isCreativeKind("apresentacao")).toBe(false);
  });

  it("cada ferramenta tem config default coerente", () => {
    for (const t of CREATIVE_TOOLS) {
      expect(t.defaultConfig.width).toBeGreaterThan(0);
      expect(t.defaultConfig.height).toBeGreaterThan(0);
    }
  });
});

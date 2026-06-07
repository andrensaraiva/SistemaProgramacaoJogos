import { describe, expect, it } from "vitest";

import { progressoNivel } from "./level";

describe("progressoNivel", () => {
  it("xp 0 → nível 1, começo", () => {
    expect(progressoNivel(0)).toEqual({ level: 1, xpNoNivel: 0, faltam: 100, pct: 0 });
  });

  it("xp 50 → nível 1, metade", () => {
    expect(progressoNivel(50)).toEqual({ level: 1, xpNoNivel: 50, faltam: 50, pct: 50 });
  });

  it("xp 99 → nível 1, quase lá", () => {
    expect(progressoNivel(99)).toEqual({ level: 1, xpNoNivel: 99, faltam: 1, pct: 99 });
  });

  it("xp 100 → sobe para nível 2", () => {
    expect(progressoNivel(100)).toEqual({ level: 2, xpNoNivel: 0, faltam: 100, pct: 0 });
  });

  it("xp 250 → nível 3, 50 dentro", () => {
    expect(progressoNivel(250)).toEqual({ level: 3, xpNoNivel: 50, faltam: 50, pct: 50 });
  });

  it("trata valores inválidos como 0", () => {
    expect(progressoNivel(NaN)).toMatchObject({ level: 1, xpNoNivel: 0 });
    expect(progressoNivel(-30)).toMatchObject({ level: 1, xpNoNivel: 0 });
  });
});

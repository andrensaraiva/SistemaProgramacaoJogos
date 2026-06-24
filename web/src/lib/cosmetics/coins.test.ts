import { describe, expect, it } from "vitest";

import { coinBalance, coinsForLevel, coinsGainedBetween } from "./coins";

describe("economia de moedas", () => {
  it("nível 1 não tem moedas; cresce com o nível", () => {
    expect(coinsForLevel(1)).toBe(0);
    expect(coinsForLevel(2)).toBe(10);
    expect(coinsForLevel(4)).toBe(30);
  });

  it("marcos dão bônus (5/10/20)", () => {
    // níveis 2..5 = 40 de base + 20 de bônus no 5
    expect(coinsForLevel(5)).toBe(40 + 20);
    // até o 10: 90 base + 20 (marco 5) + 50 (marco 10)
    expect(coinsForLevel(10)).toBe(90 + 20 + 50);
  });

  it("é monotônica (nunca diminui ao subir de nível)", () => {
    for (let l = 1; l < 60; l++) {
      expect(coinsForLevel(l + 1)).toBeGreaterThanOrEqual(coinsForLevel(l));
    }
  });

  it("saldo = ganho + bônus - gasto, nunca negativo", () => {
    expect(coinBalance(5, 0, 0)).toBe(coinsForLevel(5));
    expect(coinBalance(5, 100, 30)).toBe(coinsForLevel(5) + 100 - 30);
    expect(coinBalance(2, 0, 9999)).toBe(0);
  });

  it("coinsGainedBetween mede o ganho de subir de nível", () => {
    expect(coinsGainedBetween(4, 5)).toBe(coinsForLevel(5) - coinsForLevel(4));
    expect(coinsGainedBetween(5, 4)).toBe(0);
  });
});

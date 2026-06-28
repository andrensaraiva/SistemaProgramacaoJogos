import { describe, expect, it } from "vitest";

import { difficultyMultiplier, gradeXp, levelFromXp, participationXp } from "./reward-xp";

describe("difficultyMultiplier", () => {
  it("segue a escala do trigger de código", () => {
    expect(difficultyMultiplier("facil")).toBe(1.0);
    expect(difficultyMultiplier("medio")).toBe(1.5);
    expect(difficultyMultiplier("dificil")).toBe(2.0);
    expect(difficultyMultiplier("desafio")).toBe(3.0);
  });
  it("cai no 1.0 para valor desconhecido", () => {
    expect(difficultyMultiplier("xpto")).toBe(1.0);
  });
});

describe("participationXp", () => {
  it("escala pela dificuldade", () => {
    expect(participationXp("facil")).toBe(10);
    expect(participationXp("medio")).toBe(15);
    expect(participationXp("dificil")).toBe(20);
    expect(participationXp("desafio")).toBe(30);
  });
});

describe("gradeXp", () => {
  it("é proporcional à nota", () => {
    expect(gradeXp(10, "facil")).toBe(30); // nota cheia, fácil
    expect(gradeXp(5, "facil")).toBe(15); // metade
    expect(gradeXp(0, "facil")).toBe(0);
  });
  it("escala pela dificuldade", () => {
    expect(gradeXp(10, "desafio")).toBe(90); // 30 * 3.0
    expect(gradeXp(8, "dificil")).toBe(48); // (8/10)*30*2.0
  });
  it("nota nula ou negativa não dá XP", () => {
    expect(gradeXp(null, "dificil")).toBe(0);
    expect(gradeXp(-3, "facil")).toBe(0);
  });
  it("limita a nota em 10", () => {
    expect(gradeXp(12, "facil")).toBe(30);
  });
});

describe("levelFromXp", () => {
  it("100 XP por nível, começando no 1", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(1240)).toBe(13);
  });
});

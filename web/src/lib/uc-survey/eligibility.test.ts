import { describe, expect, it } from "vitest";

import { mediaTopicos, ratingValido, SURVEY_TOPICS, ucEncerrada, type SurveyRatings } from "./eligibility";

describe("ucEncerrada", () => {
  it("false quando não há datas", () => {
    expect(ucEncerrada([], "2026-06-28")).toBe(false);
  });
  it("true quando a última aula já passou", () => {
    expect(ucEncerrada(["2026-06-01", "2026-06-20"], "2026-06-28")).toBe(true);
  });
  it("false quando ainda há aula hoje ou no futuro", () => {
    expect(ucEncerrada(["2026-06-20", "2026-06-28"], "2026-06-28")).toBe(false);
    expect(ucEncerrada(["2026-07-10"], "2026-06-28")).toBe(false);
  });
});

describe("ratingValido", () => {
  it("aceita null e 1–5", () => {
    expect(ratingValido(null)).toBe(true);
    expect(ratingValido(1)).toBe(true);
    expect(ratingValido(5)).toBe(true);
  });
  it("rejeita fora do intervalo ou não-inteiro", () => {
    expect(ratingValido(0)).toBe(false);
    expect(ratingValido(6)).toBe(false);
    expect(ratingValido(3.5)).toBe(false);
  });
});

describe("mediaTopicos", () => {
  it("ignora null e arredonda 1 casa", () => {
    const r: SurveyRatings = { infra: 4, didatica: 5, ritmo: null, geral: 3 };
    expect(mediaTopicos(r)).toBe(4); // (4+5+3)/3 = 4
  });
  it("null quando nada preenchido", () => {
    const r: SurveyRatings = { infra: null, didatica: null, ritmo: null, geral: null };
    expect(mediaTopicos(r)).toBeNull();
  });
});

describe("SURVEY_TOPICS", () => {
  it("tem os 4 tópicos com ids únicos", () => {
    const ids = SURVEY_TOPICS.map((t) => t.id);
    expect(ids).toEqual(["infra", "didatica", "ritmo", "geral"]);
    expect(new Set(ids).size).toBe(4);
  });
});

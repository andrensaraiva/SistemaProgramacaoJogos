import { describe, expect, it } from "vitest";

import { parseSuggestion } from "./grade-parse";

describe("parseSuggestion", () => {
  it("extrai grade e feedback de JSON puro", () => {
    const r = parseSuggestion('{"grade": 8.5, "feedback": "Bom trabalho!"}');
    expect(r).toEqual({ grade: 8.5, feedback: "Bom trabalho!" });
  });

  it("tolera cercas de código markdown", () => {
    const r = parseSuggestion('```json\n{"grade": 7, "feedback": "Ok"}\n```');
    expect(r).toEqual({ grade: 7, feedback: "Ok" });
  });

  it("tolera texto antes/depois do JSON", () => {
    const r = parseSuggestion('Aqui está: {"grade": 9, "feedback": "Ótimo"} pronto.');
    expect(r?.grade).toBe(9);
  });

  it("limita a nota em [0,10]", () => {
    expect(parseSuggestion('{"grade": 12, "feedback": "x"}')?.grade).toBe(10);
    expect(parseSuggestion('{"grade": -3, "feedback": "x"}')?.grade).toBe(0);
  });

  it("arredonda para uma casa decimal", () => {
    expect(parseSuggestion('{"grade": 7.849, "feedback": "x"}')?.grade).toBe(7.8);
  });

  it("retorna null sem feedback", () => {
    expect(parseSuggestion('{"grade": 8, "feedback": ""}')).toBeNull();
  });

  it("retorna null para JSON inválido ou sem objeto", () => {
    expect(parseSuggestion("não é json")).toBeNull();
    expect(parseSuggestion('{"grade": }')).toBeNull();
  });
});

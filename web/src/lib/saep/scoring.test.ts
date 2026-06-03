import { describe, expect, it } from "vitest";

import { countCorrect, decideDuelWinner, elo, scorePercent } from "./scoring";

describe("elo", () => {
  it("dá deltas simétricos (winner ganha o que loser perde)", () => {
    const { winnerDelta, loserDelta } = elo(1000, 1000);
    expect(winnerDelta).toBe(-loserDelta);
  });

  it("ratings iguais -> ±16 (metade do K=32)", () => {
    expect(elo(1000, 1000).winnerDelta).toBe(16);
  });

  it("vencer um mais fraco rende menos pontos que vencer um mais forte", () => {
    const venceuFraco = elo(1400, 1000).winnerDelta;
    const venceuForte = elo(1000, 1400).winnerDelta;
    expect(venceuForte).toBeGreaterThan(venceuFraco);
  });
});

describe("countCorrect", () => {
  const gabarito = new Map([
    ["a", true],
    ["b", false],
    ["c", true],
  ]);

  it("conta só as alternativas corretas", () => {
    const answers = [{ option_id: "a" }, { option_id: "b" }, { option_id: "c" }];
    expect(countCorrect(answers, gabarito)).toBe(2);
  });

  it("ignora resposta em branco e opção desconhecida", () => {
    const answers = [{ option_id: "" }, { option_id: "zzz" }, { option_id: "a" }];
    expect(countCorrect(answers, gabarito)).toBe(1);
  });

  it("zero acertos quando nada bate", () => {
    expect(countCorrect([{ option_id: "b" }], gabarito)).toBe(0);
  });
});

describe("scorePercent", () => {
  it("calcula e arredonda", () => {
    expect(scorePercent(2, 3)).toBe(67);
    expect(scorePercent(5, 10)).toBe(50);
  });

  it("total inválido -> null", () => {
    expect(scorePercent(0, 0)).toBeNull();
    expect(scorePercent(3, -1)).toBeNull();
  });
});

describe("decideDuelWinner", () => {
  it("mais acertos vence", () => {
    expect(decideDuelWinner({ correct: 4, ms: 9999 }, { correct: 3, ms: 1 })).toBe("a");
    expect(decideDuelWinner({ correct: 1, ms: 1 }, { correct: 2, ms: 9999 })).toBe("b");
  });

  it("empate de acertos decide pelo menor tempo", () => {
    expect(decideDuelWinner({ correct: 3, ms: 5000 }, { correct: 3, ms: 8000 })).toBe("a");
    expect(decideDuelWinner({ correct: 3, ms: 9000 }, { correct: 3, ms: 8000 })).toBe("b");
  });

  it("empate total (acertos e tempo) -> null", () => {
    expect(decideDuelWinner({ correct: 3, ms: 5000 }, { correct: 3, ms: 5000 })).toBeNull();
  });

  it("tempo nulo perde para tempo conhecido no desempate", () => {
    expect(decideDuelWinner({ correct: 2, ms: null }, { correct: 2, ms: 3000 })).toBe("b");
  });
});

import { describe, expect, it } from "vitest";

import { computeSapScore } from "./scoring";

const items = [
  { id: "a", points: 2 },
  { id: "b", points: 6 },
  { id: "c", points: 2 },
];

describe("computeSapScore", () => {
  it("soma os pontos dos itens marcados Sim", () => {
    const marks = new Map([
      ["a", true],
      ["b", false],
      ["c", true],
    ]);
    const r = computeSapScore(items, marks);
    expect(r.score).toBe(4);
    expect(r.maxScore).toBe(10);
    expect(r.pct).toBe(40);
  });

  it("tudo Sim -> nota cheia (100%)", () => {
    const marks = new Map([
      ["a", true],
      ["b", true],
      ["c", true],
    ]);
    const r = computeSapScore(items, marks);
    expect(r.score).toBe(10);
    expect(r.pct).toBe(100);
  });

  it("item sem marca conta como Não", () => {
    const r = computeSapScore(items, new Map([["b", true]]));
    expect(r.score).toBe(6);
    expect(r.pct).toBe(60);
  });

  it("rubrica vazia -> pct null (sem divisão por zero)", () => {
    const r = computeSapScore([], new Map());
    expect(r.score).toBe(0);
    expect(r.maxScore).toBe(0);
    expect(r.pct).toBeNull();
  });

  it("pontos fracionários arredondam corretamente", () => {
    const r = computeSapScore(
      [
        { id: "x", points: 0.5 },
        { id: "y", points: 0.5 },
        { id: "z", points: 0.5 },
      ],
      new Map([["x", true]]),
    );
    expect(r.score).toBe(0.5);
    expect(r.maxScore).toBe(1.5);
    expect(r.pct).toBe(33);
  });
});

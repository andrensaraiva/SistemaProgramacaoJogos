import { describe, expect, it } from "vitest";

import { averageRating, summarize, type FeedbackItem } from "./aggregate";

const item = (rating: number, sessionId: string | null = null, comment: string | null = null): FeedbackItem => ({
  rating,
  comment,
  classUnitId: null,
  sessionId,
  createdAt: "2026-06-04",
});

describe("summarize", () => {
  it("vazio → média null e zeros", () => {
    const s = summarize([]);
    expect(s.total).toBe(0);
    expect(s.average).toBeNull();
    expect(s.geralCount).toBe(0);
    expect(s.porAulaCount).toBe(0);
  });

  it("calcula média e distribuição", () => {
    const s = summarize([item(5), item(4), item(3)]);
    expect(s.total).toBe(3);
    expect(s.average).toBe(4); // (5+4+3)/3 = 4.0
    expect(s.distribution[5]).toBe(1);
    expect(s.distribution[4]).toBe(1);
    expect(s.distribution[3]).toBe(1);
  });

  it("arredonda a média para 1 casa", () => {
    const s = summarize([item(5), item(4)]); // 4.5
    expect(s.average).toBe(4.5);
    const s2 = summarize([item(5), item(4), item(4)]); // 4.333 -> 4.3
    expect(s2.average).toBe(4.3);
  });

  it("separa geral de por-aula", () => {
    const s = summarize([item(5, null), item(4, "sess-1"), item(3, "sess-2")]);
    expect(s.geralCount).toBe(1);
    expect(s.porAulaCount).toBe(2);
  });

  it("coleta só comentários não-vazios, com a estrela", () => {
    const s = summarize([item(5, null, "ótimo"), item(2, null, "   "), item(3, "s1", "ok")]);
    expect(s.comments).toEqual([
      { rating: 5, comment: "ótimo", sessionId: null },
      { rating: 3, comment: "ok", sessionId: "s1" },
    ]);
  });

  it("clampa ratings fora de 1..5", () => {
    const s = summarize([item(0), item(9)]);
    expect(s.distribution[1]).toBe(1);
    expect(s.distribution[5]).toBe(1);
  });
});

describe("averageRating", () => {
  it("média simples e null se vazio", () => {
    expect(averageRating([])).toBeNull();
    expect(averageRating([5, 4, 3])).toBe(4);
    expect(averageRating([5, 4])).toBe(4.5);
  });
});

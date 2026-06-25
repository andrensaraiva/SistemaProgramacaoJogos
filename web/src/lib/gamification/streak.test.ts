import { describe, expect, it } from "vitest";

import { applyVisit, daysBetween, displayStreak, todayLocalISO, type StreakState } from "./streak";

const empty: StreakState = { current: 0, longest: 0, lastActiveOn: null };

describe("daysBetween", () => {
  it("conta dias inteiros entre datas", () => {
    expect(daysBetween("2026-06-01", "2026-06-01")).toBe(0);
    expect(daysBetween("2026-06-01", "2026-06-02")).toBe(1);
    expect(daysBetween("2026-06-01", "2026-06-10")).toBe(9);
  });

  it("atravessa virada de mês e ano corretamente", () => {
    expect(daysBetween("2026-01-31", "2026-02-01")).toBe(1);
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(1);
  });
});

describe("todayLocalISO", () => {
  it("formata como YYYY-MM-DD com zero à esquerda", () => {
    expect(todayLocalISO(new Date(2026, 2, 5))).toBe("2026-03-05");
  });
});

describe("applyVisit", () => {
  it("primeira visita começa em 1", () => {
    const r = applyVisit(empty, "2026-06-10");
    expect(r.current).toBe(1);
    expect(r.longest).toBe(1);
    expect(r.lastActiveOn).toBe("2026-06-10");
  });

  it("dia seguinte incrementa a sequência", () => {
    const dia1 = applyVisit(empty, "2026-06-10");
    const dia2 = applyVisit(dia1, "2026-06-11");
    expect(dia2.current).toBe(2);
    expect(dia2.longest).toBe(2);
  });

  it("mesma data não pontua de novo (idempotente no dia)", () => {
    const dia1 = applyVisit(empty, "2026-06-10");
    const denovo = applyVisit(dia1, "2026-06-10");
    expect(denovo).toBe(dia1);
    expect(denovo.current).toBe(1);
  });

  it("pular um dia reinicia em 1 mas mantém o recorde", () => {
    let s = applyVisit(empty, "2026-06-10");
    s = applyVisit(s, "2026-06-11");
    s = applyVisit(s, "2026-06-12"); // current 3
    s = applyVisit(s, "2026-06-15"); // pulou 13 e 14
    expect(s.current).toBe(1);
    expect(s.longest).toBe(3);
  });
});

describe("displayStreak", () => {
  it("mostra a sequência se apareceu hoje", () => {
    const s = applyVisit(empty, "2026-06-10");
    expect(displayStreak(s, "2026-06-10")).toBe(1);
  });

  it("mostra a sequência se apareceu ontem (ainda dá pra manter hoje)", () => {
    let s = applyVisit(empty, "2026-06-09");
    s = applyVisit(s, "2026-06-10"); // current 2, last = 10
    expect(displayStreak(s, "2026-06-11")).toBe(2);
  });

  it("zera a exibição se esfriou (2+ dias sem aparecer)", () => {
    const s = applyVisit(empty, "2026-06-10");
    expect(displayStreak(s, "2026-06-13")).toBe(0);
  });

  it("zera quando nunca houve atividade", () => {
    expect(displayStreak(empty, "2026-06-10")).toBe(0);
  });
});

import { describe, expect, it } from "vitest";

import { totalizar, type DayAlloc, type Target } from "./totals";

const aula = (cu: string | null, marker: string | null = null): DayAlloc => ({
  classUnitId: cu,
  marker,
});

describe("totalizar", () => {
  it("alocadas = dias × aulasPorDia, por UC", () => {
    const days = [aula("a"), aula("a"), aula("b")];
    const targets: Target[] = [
      { classUnitId: "a", chPresencial: 16 },
      { classUnitId: "b", chPresencial: 8 },
    ];
    const t = totalizar(days, targets, 4);
    const a = t.porUc.find((x) => x.classUnitId === "a")!;
    const b = t.porUc.find((x) => x.classUnitId === "b")!;
    expect(a.alocadas).toBe(8); // 2 dias × 4
    expect(a.necessarias).toBe(16);
    expect(a.faltam).toBe(8);
    expect(a.fechou).toBe(false);
    expect(b.alocadas).toBe(4);
    expect(b.faltam).toBe(4);
  });

  it("marca fechou quando alocadas >= necessarias", () => {
    const days = [aula("a"), aula("a"), aula("a"), aula("a")];
    const t = totalizar(days, [{ classUnitId: "a", chPresencial: 12 }], 4);
    const a = t.porUc[0];
    expect(a.alocadas).toBe(16);
    expect(a.fechou).toBe(true);
    expect(a.faltam).toBe(0);
    expect(a.excedente).toBe(4);
  });

  it("ignora dias com marker (feriado/recesso)", () => {
    const days = [aula("a"), aula(null, "feriado"), aula("a", "recesso")];
    const t = totalizar(days, [{ classUnitId: "a", chPresencial: 8 }], 4);
    expect(t.diasAlocados).toBe(1); // só o primeiro
    expect(t.porUc[0].alocadas).toBe(4);
  });

  it("UC alocada sem target aparece com necessarias=0", () => {
    const t = totalizar([aula("x")], [], 4);
    expect(t.porUc[0]).toMatchObject({ classUnitId: "x", necessarias: 0, alocadas: 4, fechou: false, pct: null });
  });

  it("totais gerais somam tudo", () => {
    const days = [aula("a"), aula("b")];
    const t = totalizar(days, [
      { classUnitId: "a", chPresencial: 4 },
      { classUnitId: "b", chPresencial: 4 },
    ], 4);
    expect(t.totalNecessarias).toBe(8);
    expect(t.totalAlocadas).toBe(8);
  });

  it("respeita a ordem dos targets", () => {
    const t = totalizar([aula("b"), aula("a")], [
      { classUnitId: "a", chPresencial: 4 },
      { classUnitId: "b", chPresencial: 4 },
    ], 4);
    expect(t.porUc.map((u) => u.classUnitId)).toEqual(["a", "b"]);
  });
});

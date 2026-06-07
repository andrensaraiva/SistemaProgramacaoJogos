import { describe, expect, it } from "vitest";

import { computeOccupancy, conflitosEm, type OccupancyDay } from "./occupancy";

const d = (date: string, roomId: string | null, classId: string, turma: string): OccupancyDay => ({
  date,
  roomId,
  classId,
  turma,
});

describe("computeOccupancy", () => {
  it("ignora dias sem sala", () => {
    const occ = computeOccupancy([d("2026-01-26", null, "c1", "T1")]);
    expect(occ.slots).toHaveLength(0);
    expect(occ.datas).toHaveLength(0);
  });

  it("monta ocupação por sala e data", () => {
    const occ = computeOccupancy([
      d("2026-01-26", "r1", "c1", "T1"),
      d("2026-01-27", "r1", "c1", "T1"),
      d("2026-01-26", "r2", "c2", "T2"),
    ]);
    expect(occ.datas).toEqual(["2026-01-26", "2026-01-27"]);
    expect(occ.porSala.get("r1")).toHaveLength(2);
    expect(occ.porSala.get("r2")).toHaveLength(1);
    expect(occ.totalConflitos).toBe(0);
  });

  it("detecta conflito: 2 turmas na mesma sala/data", () => {
    const occ = computeOccupancy([
      d("2026-01-26", "r1", "c1", "T1"),
      d("2026-01-26", "r1", "c2", "T2"),
    ]);
    const slot = occ.slots[0];
    expect(slot.conflito).toBe(true);
    expect(slot.turmas.map((t) => t.turma).sort()).toEqual(["T1", "T2"]);
    expect(occ.totalConflitos).toBe(1);
  });

  it("mesma turma com 2 UCs no mesmo dia/sala não é conflito", () => {
    const occ = computeOccupancy([
      d("2026-01-26", "r1", "c1", "T1"),
      d("2026-01-26", "r1", "c1", "T1"),
    ]);
    expect(occ.slots[0].conflito).toBe(false);
    expect(occ.slots[0].turmas).toHaveLength(1);
  });
});

describe("conflitosEm", () => {
  it("lista turmas que já ocupam a sala na data (exceto a própria)", () => {
    const days = [
      d("2026-01-26", "r1", "c1", "T1"),
      d("2026-01-26", "r1", "c2", "T2"),
    ];
    expect(conflitosEm(days, "r1", "2026-01-26", "c1")).toEqual(["T2"]);
    expect(conflitosEm(days, "r1", "2026-01-27", "c1")).toEqual([]);
  });
});

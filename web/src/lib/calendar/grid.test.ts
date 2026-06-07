import { describe, expect, it } from "vitest";

import { addDays, gerarDias, isoWeekday, marcarFeriados, mergeGrid, type DayCell } from "./grid";

describe("isoWeekday", () => {
  it("calcula o dia da semana sem bug de fuso", () => {
    expect(isoWeekday("2026-01-26")).toBe(1); // segunda
    expect(isoWeekday("2026-01-27")).toBe(2); // terça
    expect(isoWeekday("2026-02-01")).toBe(7); // domingo
  });
});

describe("addDays", () => {
  it("soma dias atravessando mês", () => {
    expect(addDays("2026-01-30", 2)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("gerarDias", () => {
  it("gera só os dias da semana pedidos", () => {
    // 26/01 (seg) a 30/01 (sex), só seg-qua {1,2,3}
    const dias = gerarDias("2026-01-26", "2026-01-30", [1, 2, 3]);
    expect(dias).toEqual(["2026-01-26", "2026-01-27", "2026-01-28"]);
  });

  it("inclui o último dia e ignora fim de semana", () => {
    const dias = gerarDias("2026-01-29", "2026-02-02", [1, 2, 3, 4, 5]);
    // qui 29, sex 30, (sáb 31, dom 01 fora), seg 02
    expect(dias).toEqual(["2026-01-29", "2026-01-30", "2026-02-02"]);
  });

  it("retorna vazio se intervalo inválido", () => {
    expect(gerarDias("2026-02-10", "2026-02-01", [1])).toEqual([]);
    expect(gerarDias("", "", [1])).toEqual([]);
  });
});

const cell = (date: string, cu: string | null = null): DayCell => ({
  date,
  classUnitId: cu,
  marker: null,
  note: null,
});

describe("marcarFeriados", () => {
  it("marca o dia com o feriado e remove a UC", () => {
    const days = [cell("2026-04-20", "cu-1"), cell("2026-04-22", "cu-1")];
    const out = marcarFeriados(days, [{ date: "2026-04-20", name: "Tiradentes", kind: "feriado" }]);
    expect(out[0]).toMatchObject({ marker: "feriado", note: "Tiradentes", classUnitId: null });
    expect(out[1]).toMatchObject({ marker: null, classUnitId: "cu-1" });
  });
});

describe("mergeGrid", () => {
  it("preserva alocações ao regenerar e remarca feriados", () => {
    const anteriores = [cell("2026-01-26", "cu-1"), cell("2026-01-27", "cu-2")];
    const novas = ["2026-01-26", "2026-01-27", "2026-01-28"]; // +1 dia novo
    const out = mergeGrid(novas, anteriores, [{ date: "2026-01-27", name: "X", kind: "recesso" }]);
    expect(out[0]).toMatchObject({ date: "2026-01-26", classUnitId: "cu-1" }); // preservado
    expect(out[1]).toMatchObject({ date: "2026-01-27", marker: "recesso", classUnitId: null }); // feriado venceu
    expect(out[2]).toMatchObject({ date: "2026-01-28", classUnitId: null }); // novo, vazio
  });
});

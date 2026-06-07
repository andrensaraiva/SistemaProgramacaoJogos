import { describe, expect, it } from "vitest";

import { csvFilename, toCsv } from "./csv";

describe("toCsv", () => {
  it("começa com BOM UTF-8", () => {
    const out = toCsv(["a"], [["1"]]);
    expect(out.charCodeAt(0)).toBe(0xfeff);
  });

  it("usa ; como separador e CRLF entre linhas", () => {
    const out = toCsv(["Nome", "Nota"], [["Ana", 7]]);
    const semBom = out.slice(1);
    expect(semBom).toBe("Nome;Nota\r\nAna;7");
  });

  it("escapa campos com ; aspas e quebra de linha", () => {
    const out = toCsv(["x"], [['a;b'], ['diz "oi"'], ["linha1\nlinha2"]]);
    const semBom = out.slice(1);
    const linhas = semBom.split("\r\n");
    expect(linhas[1]).toBe('"a;b"');
    expect(linhas[2]).toBe('"diz ""oi"""');
    expect(linhas[3]).toBe('"linha1\nlinha2"');
  });

  it("trata null/undefined como vazio", () => {
    const out = toCsv(["a", "b", "c"], [[null, undefined, 0]]);
    expect(out.slice(1)).toBe("a;b;c\r\n;;0");
  });
});

describe("csvFilename", () => {
  it("remove acentos, espaços e adiciona a data", () => {
    const d = new Date("2026-06-04T10:00:00Z");
    expect(csvFilename("Relatório de Professores", d)).toBe(
      "relatorio-de-professores-2026-06-04.csv",
    );
  });
});

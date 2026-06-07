// Serializador CSV puro (sem I/O) — testável isoladamente.
//
// Decisões para abrir bem no Excel PT-BR:
//   - separador ';' (Excel PT-BR usa ; como delimitador de colunas);
//   - prefixo BOM UTF-8 para os acentos não saírem corrompidos;
//   - campos com ; aspas ou quebra de linha são envolvidos em aspas e as aspas
//     internas viram "".

export type CsvCell = string | number | null | undefined;

const SEP = ";";
const BOM = "﻿";

function escapeCell(value: CsvCell): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes(SEP) || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Monta um CSV (com BOM) a partir de cabeçalhos e linhas. `rows` é uma matriz de
 * células na MESMA ordem dos cabeçalhos.
 */
export function toCsv(headers: CsvCell[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(SEP));
  return BOM + lines.join("\r\n");
}

/** Nome de arquivo seguro com data, ex.: "relatorio-professores-2026-06-04.csv". */
export function csvFilename(base: string, date = new Date()): string {
  const iso = date.toISOString().slice(0, 10);
  const safe = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${safe}-${iso}.csv`;
}

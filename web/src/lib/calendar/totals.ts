// Totalizador de aulas por UC (puro, sem I/O) — espelha o TOTALIZADOR da
// planilha SENAI: por UC, aulas alocadas vs necessárias, faltam e flag "fechou".

export type DayAlloc = { classUnitId: string | null; marker: string | null };
export type Target = { classUnitId: string; chPresencial: number };

export type UcTotal = {
  classUnitId: string;
  necessarias: number; // aulas necessárias (= ch_presencial, 1h = 1 aula)
  alocadas: number; // dias alocados × aulasPorDia
  faltam: number; // max(0, necessarias - alocadas)
  excedente: number; // max(0, alocadas - necessarias)
  pct: number | null; // alocadas / necessarias
  fechou: boolean; // alocadas >= necessarias
};

export type CalendarTotals = {
  porUc: UcTotal[];
  totalNecessarias: number;
  totalAlocadas: number;
  diasAlocados: number; // dias com UC (não-marcador)
};

/**
 * Calcula o totalizador. `aulasPorDia` multiplica os dias alocados a cada UC.
 * Dias com marker (feriado/recesso) não contam como aula. UCs sem target ainda
 * aparecem se tiverem dias alocados (necessarias = 0).
 */
export function totalizar(
  days: DayAlloc[],
  targets: Target[],
  aulasPorDia: number,
): CalendarTotals {
  const apd = Math.max(1, Math.trunc(aulasPorDia || 1));

  // Conta dias alocados por UC (ignora dias com marker).
  const diasPorUc = new Map<string, number>();
  let diasAlocados = 0;
  for (const d of days) {
    if (d.marker) continue;
    if (!d.classUnitId) continue;
    diasPorUc.set(d.classUnitId, (diasPorUc.get(d.classUnitId) ?? 0) + 1);
    diasAlocados += 1;
  }

  // União das UCs (targets + alocadas).
  const ids = new Set<string>([...targets.map((t) => t.classUnitId), ...diasPorUc.keys()]);
  const chById = new Map(targets.map((t) => [t.classUnitId, Math.max(0, Math.trunc(t.chPresencial || 0))]));

  const porUc: UcTotal[] = [];
  let totalNecessarias = 0;
  let totalAlocadas = 0;

  for (const id of ids) {
    const necessarias = chById.get(id) ?? 0;
    const alocadas = (diasPorUc.get(id) ?? 0) * apd;
    totalNecessarias += necessarias;
    totalAlocadas += alocadas;
    porUc.push({
      classUnitId: id,
      necessarias,
      alocadas,
      faltam: Math.max(0, necessarias - alocadas),
      excedente: Math.max(0, alocadas - necessarias),
      pct: necessarias > 0 ? Math.round((alocadas / necessarias) * 100) : null,
      fechou: necessarias > 0 && alocadas >= necessarias,
    });
  }

  // Ordena pela ordem dos targets, depois as extras.
  const ordem = new Map(targets.map((t, i) => [t.classUnitId, i]));
  porUc.sort((a, b) => (ordem.get(a.classUnitId) ?? 999) - (ordem.get(b.classUnitId) ?? 999));

  return { porUc, totalNecessarias, totalAlocadas, diasAlocados };
}

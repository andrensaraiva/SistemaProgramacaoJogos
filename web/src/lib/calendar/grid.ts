// Geração da grade de dias letivos (puro, sem I/O). Datas SEMPRE em string
// "YYYY-MM-DD" para evitar bug de fuso (-1 dia) do Date nativo.

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1=seg ... 7=dom (ISO)

export type Holiday = { date: string; name: string; kind: string };

/** Dia da semana ISO (1=seg..7=dom) de uma data "YYYY-MM-DD", sem fuso. */
export function isoWeekday(dateStr: string): Weekday {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Date.UTC evita o deslocamento de fuso local.
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=dom..6=sáb
  return (dow === 0 ? 7 : dow) as Weekday;
}

/** Soma `n` dias a uma data "YYYY-MM-DD" (sem fuso). */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/**
 * Gera as datas letivas entre startsOn e endsOn (inclusive) cujos dias da semana
 * estão em `weekdays`. Retorna lista ordenada de "YYYY-MM-DD".
 */
export function gerarDias(startsOn: string, endsOn: string, weekdays: number[]): string[] {
  if (!startsOn || !endsOn || startsOn > endsOn) return [];
  const set = new Set(weekdays);
  const out: string[] = [];
  let cur = startsOn;
  // Trava de segurança: no máx. ~3 anos de dias.
  let guard = 0;
  while (cur <= endsOn && guard < 1200) {
    if (set.has(isoWeekday(cur))) out.push(cur);
    cur = addDays(cur, 1);
    guard += 1;
  }
  return out;
}

export type DayCell = {
  date: string;
  classUnitId: string | null;
  marker: string | null; // 'feriado' | 'recesso' | ... | null
  note: string | null;
};

/**
 * Aplica os feriados/eventos às células: dia com feriado recebe o marker (kind)
 * e a nota (name), e perde qualquer UC alocada. Datas sem feriado ficam como
 * estão. Não cria dias novos — só marca os existentes.
 */
export function marcarFeriados(days: DayCell[], holidays: Holiday[]): DayCell[] {
  const byDate = new Map<string, Holiday>();
  for (const h of holidays) byDate.set(h.date, h);
  return days.map((d) => {
    const h = byDate.get(d.date);
    if (!h) return d;
    return { ...d, marker: h.kind, note: h.name, classUnitId: null };
  });
}

/**
 * Recria a grade preservando o que já foi alocado: para cada data nova, mantém
 * classUnitId/marker/note se a data já existia. Depois marca feriados (que têm
 * prioridade). Usado ao REGENERAR o calendário sem perder o trabalho.
 */
export function mergeGrid(
  novasDatas: string[],
  anteriores: DayCell[],
  holidays: Holiday[],
): DayCell[] {
  const prev = new Map(anteriores.map((d) => [d.date, d]));
  const base: DayCell[] = novasDatas.map((date) => {
    const old = prev.get(date);
    return old
      ? { date, classUnitId: old.classUnitId, marker: old.marker, note: old.note }
      : { date, classUnitId: null, marker: null, note: null };
  });
  return marcarFeriados(base, holidays);
}

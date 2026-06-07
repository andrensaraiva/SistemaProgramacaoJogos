"use client";

import { useActionState, useMemo, useState } from "react";

import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  alocarDia,
  gerarCalendario,
  marcarDia,
  salvarTargets,
  type CalendarState,
} from "@/lib/calendar/actions";
import { isoWeekday } from "@/lib/calendar/grid";
import { totalizar, type DayAlloc } from "@/lib/calendar/totals";
import { definirSalaDoDia } from "@/lib/rooms/actions";

export type UcInfo = { classUnitId: string; title: string };
export type RoomInfo = { id: string; name: string };
type DayRow = { id: string; date: string; classUnitId: string | null; marker: string | null; note: string | null; roomId: string | null };
type Cal = { id: string; startsOn: string; endsOn: string; weekdays: number[]; aulasPorDia: number };

const WEEKDAYS = [
  { v: 1, l: "Seg" },
  { v: 2, l: "Ter" },
  { v: 3, l: "Qua" },
  { v: 4, l: "Qui" },
  { v: 5, l: "Sex" },
  { v: 6, l: "Sáb" },
];

// Paleta para UCs (distinta o bastante). Markers têm cor fixa.
const UC_PALETTE = [
  "#4c97ff", "#9966ff", "#ff8c1a", "#2ecc71", "#e74c3c",
  "#1abc9c", "#e67e22", "#3498db", "#9b59b6", "#16a085",
  "#d35400", "#27ae60", "#2980b9", "#8e44ad", "#c0392b",
];
const MARKER_COLOR: Record<string, string> = {
  feriado: "#e74c3c",
  recesso: "#ff66cc",
  ferias: "#ff66cc",
  capacitacao: "#cc66ff",
  conselho: "#2ecc71",
  evento: "#f1c40f",
};
const MARKER_LABEL: Record<string, string> = {
  feriado: "Feriado",
  recesso: "Recesso",
  ferias: "Férias",
  capacitacao: "Capacitação",
  conselho: "Conselho",
  evento: "Evento",
};

const PRINT_CSS = `
@media print {
  @page { size: landscape; margin: 10mm; }
  header, nav, aside, .no-print { display: none !important; }
  body { background:#fff !important; }
  main { max-width:none !important; padding:0 !important; margin:0 !important; }
  /* Força impressão de cores de fundo (dias coloridos). */
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  /* A grade flui na página em vez de rolar horizontalmente. */
  .cal-grid { overflow: visible !important; }
  .cal-week { break-inside: avoid; }
  /* Totalizador abaixo da grade na impressão (não ao lado). */
  .cal-body { display: block !important; }
  .cal-totalizer { width: 100% !important; margin-top: 8mm; }
}`;

function ymdLabel(date: string) {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

export function CalendarioClient({
  classId,
  turmaNome,
  ucs,
  calendar,
  days,
  targets,
  rooms,
}: {
  classId: string;
  turmaNome: string;
  ucs: UcInfo[];
  calendar: Cal | null;
  days: DayRow[];
  targets: { classUnitId: string; chPresencial: number }[];
  rooms: RoomInfo[];
}) {
  const ucColor = useMemo(() => {
    const m = new Map<string, string>();
    ucs.forEach((u, i) => m.set(u.classUnitId, UC_PALETTE[i % UC_PALETTE.length]));
    return m;
  }, [ucs]);
  const ucTitle = useMemo(() => new Map(ucs.map((u) => [u.classUnitId, u.title])), [ucs]);
  const roomName = useMemo(() => new Map(rooms.map((r) => [r.id, r.name])), [rooms]);

  const totals = useMemo(() => {
    const alloc: DayAlloc[] = days.map((d) => ({ classUnitId: d.classUnitId, marker: d.marker }));
    return totalizar(alloc, targets, calendar?.aulasPorDia ?? 4);
  }, [days, targets, calendar]);

  // Agrupa os dias por semana ISO (segunda-feira da semana).
  const semanas = useMemo(() => {
    const map = new Map<string, DayRow[]>();
    for (const d of days) {
      const wd = isoWeekday(d.date);
      // chave = data da segunda dessa semana
      const [y, mo, da] = d.date.split("-").map(Number);
      const base = new Date(Date.UTC(y, mo - 1, da));
      base.setUTCDate(base.getUTCDate() - (wd - 1));
      const key = base.toISOString().slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(d);
      map.set(key, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [days]);

  return (
    <div className="relatorio-page flex flex-col gap-5">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calendário do curso — {turmaNome}</h1>
          <p className="text-sm text-muted-foreground">
            Aloque as UCs aos dias letivos e feche a carga horária. Feriados vêm marcados.
          </p>
        </div>
        <PrintButton />
      </div>

      <SetupForm classId={classId} calendar={calendar} />

      {calendar && (
        <>
          <TargetsForm calendarId={calendar.id} ucs={ucs} targets={targets} totals={totals} />

          <div className="cal-body flex flex-col gap-3 lg:flex-row">
            {/* Grade */}
            <div className="cal-grid flex-1 overflow-x-auto">
              <Grid
                semanas={semanas}
                ucs={ucs}
                ucColor={ucColor}
                ucTitle={ucTitle}
                aulasPorDia={calendar.aulasPorDia}
                rooms={rooms}
                roomName={roomName}
              />
            </div>

            {/* Totalizador */}
            <div className="cal-totalizer w-full shrink-0 lg:w-72">
              <Totalizer totals={totals} ucTitle={ucTitle} ucColor={ucColor} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SetupForm({ classId, calendar }: { classId: string; calendar: Cal | null }) {
  const [state, action, pending] = useActionState<CalendarState, FormData>(gerarCalendario, undefined);
  const selected = new Set(calendar?.weekdays ?? [1, 2, 3, 4, 5]);

  return (
    <form action={action} className="rounded-xl border border-border bg-card p-4 no-print">
      <input type="hidden" name="class_id" value={classId} />
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Início</span>
          <Input name="starts_on" type="date" defaultValue={calendar?.startsOn ?? ""} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Fim</span>
          <Input name="ends_on" type="date" defaultValue={calendar?.endsOn ?? ""} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Aulas/dia</span>
          <Input name="aulas_por_dia" type="number" min={1} max={12} defaultValue={calendar?.aulasPorDia ?? 4} className="w-20" />
        </label>
        <div className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Dias letivos</span>
          <div className="flex gap-1">
            {WEEKDAYS.map((w) => (
              <label key={w.v} className="flex cursor-pointer items-center gap-1 rounded border border-border px-2 py-1 text-xs">
                <input type="checkbox" name="weekdays" value={w.v} defaultChecked={selected.has(w.v)} />
                {w.l}
              </label>
            ))}
          </div>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Gerando..." : calendar ? "Regenerar grade" : "Gerar grade"}
        </Button>
      </div>
      {state && (
        <p className={`mt-2 text-xs ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</p>
      )}
      {calendar && (
        <p className="mt-2 text-xs text-muted-foreground">
          Regenerar preserva as alocações já feitas nas datas que continuarem no período.
        </p>
      )}
    </form>
  );
}

function TargetsForm({
  calendarId,
  ucs,
  targets,
  totals,
}: {
  calendarId: string;
  ucs: UcInfo[];
  targets: { classUnitId: string; chPresencial: number }[];
  totals: ReturnType<typeof totalizar>;
}) {
  const [state, action, pending] = useActionState<CalendarState, FormData>(salvarTargets, undefined);
  const chById = new Map(targets.map((t) => [t.classUnitId, t.chPresencial]));

  return (
    <form action={action} className="rounded-xl border border-border bg-card p-4 no-print">
      <input type="hidden" name="calendar_id" value={calendarId} />
      <h2 className="mb-2 text-sm font-semibold">Carga horária por UC (CH presencial)</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ucs.map((u) => (
          <label key={u.classUnitId} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">{u.title}</span>
            <Input
              name={`ch_${u.classUnitId}`}
              type="number"
              min={0}
              defaultValue={chById.get(u.classUnitId) ?? 0}
              className="w-20"
            />
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Salvando..." : "Salvar carga horária"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Total necessário: {totals.totalNecessarias} · alocado: {totals.totalAlocadas}
        </span>
        {state && <span className={`text-xs ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</span>}
      </div>
    </form>
  );
}

function Grid({
  semanas,
  ucs,
  ucColor,
  ucTitle,
  aulasPorDia,
  rooms,
  roomName,
}: {
  semanas: [string, DayRow[]][];
  ucs: UcInfo[];
  ucColor: Map<string, string>;
  ucTitle: Map<string, string>;
  aulasPorDia: number;
  rooms: RoomInfo[];
  roomName: Map<string, string>;
}) {
  return (
    <div className="flex flex-col gap-2">
      {semanas.map(([weekKey, dias]) => (
        <div key={weekKey} className="cal-week flex flex-wrap gap-2">
          {dias.map((d) => (
            <DayCellView
              key={d.id}
              day={d}
              ucs={ucs}
              ucColor={ucColor}
              ucTitle={ucTitle}
              aulasPorDia={aulasPorDia}
              rooms={rooms}
              roomName={roomName}
            />
          ))}
        </div>
      ))}
      {semanas.length === 0 && (
        <p className="text-sm text-muted-foreground">Gere a grade acima para começar.</p>
      )}
    </div>
  );
}

function DayCellView({
  day,
  ucs,
  ucColor,
  ucTitle,
  aulasPorDia,
  rooms,
  roomName,
}: {
  day: DayRow;
  ucs: UcInfo[];
  ucColor: Map<string, string>;
  ucTitle: Map<string, string>;
  aulasPorDia: number;
  rooms: RoomInfo[];
  roomName: Map<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const isHoliday = !!day.marker;
  const bg = isHoliday
    ? MARKER_COLOR[day.marker!] ?? "#888"
    : day.classUnitId
      ? ucColor.get(day.classUnitId) ?? "#888"
      : "#e5e7eb";
  const label = isHoliday
    ? day.note || MARKER_LABEL[day.marker!] || day.marker
    : day.classUnitId
      ? ucTitle.get(day.classUnitId)
      : "—";
  const dark = !isHoliday && !day.classUnitId;
  const sala = day.roomId ? roomName.get(day.roomId) : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !isHoliday && setOpen((v) => !v)}
        disabled={isHoliday}
        className="flex h-20 w-28 flex-col rounded-lg border border-border p-1.5 text-left text-[11px] leading-tight"
        style={{ backgroundColor: bg, color: dark ? "#111" : "#fff", cursor: isHoliday ? "default" : "pointer" }}
        title={typeof label === "string" ? label : undefined}
      >
        <span className="font-bold">{ymdLabel(day.date)}</span>
        <span className="mt-1 line-clamp-2 overflow-hidden">{label}</span>
        {!isHoliday && day.classUnitId && (
          <span className="mt-auto flex items-center justify-between opacity-80">
            <span>{aulasPorDia} aulas</span>
            {sala && <span className="rounded bg-black/20 px-1">📍{sala}</span>}
          </span>
        )}
      </button>

      {open && !isHoliday && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 max-h-72 w-56 overflow-auto rounded-lg border border-border bg-card p-1 shadow-xl">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">UC</p>
            <form action={alocarDia}>
              <input type="hidden" name="day_id" value={day.id} />
              <input type="hidden" name="class_unit_id" value="" />
              <button type="submit" className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-muted">
                — limpar —
              </button>
            </form>
            {ucs.map((u) => (
              <form key={u.classUnitId} action={alocarDia}>
                <input type="hidden" name="day_id" value={day.id} />
                <input type="hidden" name="class_unit_id" value={u.classUnitId} />
                <button
                  type="submit"
                  className="block w-full truncate rounded px-2 py-1 text-left text-xs text-white"
                  style={{ backgroundColor: ucColor.get(u.classUnitId) }}
                >
                  {u.title}
                </button>
              </form>
            ))}

            {rooms.length > 0 && (
              <>
                <p className="mt-1 border-t border-border px-2 pt-1 text-[10px] font-semibold uppercase text-muted-foreground">
                  Sala
                </p>
                <form action={definirSalaDoDia}>
                  <input type="hidden" name="day_id" value={day.id} />
                  <input type="hidden" name="room_id" value="" />
                  <button type="submit" className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-muted">
                    — sem sala —
                  </button>
                </form>
                {rooms.map((r) => (
                  <form key={r.id} action={definirSalaDoDia}>
                    <input type="hidden" name="day_id" value={day.id} />
                    <input type="hidden" name="room_id" value={r.id} />
                    <button
                      type="submit"
                      className={`block w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-muted ${day.roomId === r.id ? "font-semibold text-primary" : ""}`}
                    >
                      📍 {r.name}
                    </button>
                  </form>
                ))}
              </>
            )}

            <div className="my-1 border-t border-border" />
            {(["recesso", "conselho", "capacitacao", "evento"] as const).map((mk) => (
              <form key={mk} action={marcarDia}>
                <input type="hidden" name="day_id" value={day.id} />
                <input type="hidden" name="marker" value={mk} />
                <button type="submit" className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-muted">
                  marcar: {MARKER_LABEL[mk]}
                </button>
              </form>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Totalizer({
  totals,
  ucTitle,
  ucColor,
}: {
  totals: ReturnType<typeof totalizar>;
  ucTitle: Map<string, string>;
  ucColor: Map<string, string>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <h2 className="mb-2 text-sm font-semibold">Totalizador (aulas)</h2>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1">UC</th>
            <th className="text-center">Nec.</th>
            <th className="text-center">Aloc.</th>
            <th className="text-center">Falta</th>
          </tr>
        </thead>
        <tbody>
          {totals.porUc.map((u) => (
            <tr key={u.classUnitId} className="border-t border-border">
              <td className="py-1">
                <span
                  className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                  style={{ backgroundColor: ucColor.get(u.classUnitId) }}
                />
                {ucTitle.get(u.classUnitId) ?? "UC"}
              </td>
              <td className="text-center">{u.necessarias}</td>
              <td className="text-center">{u.alocadas}</td>
              <td className={`text-center font-medium ${u.fechou ? "text-success" : u.faltam > 0 ? "text-warning" : ""}`}>
                {u.fechou ? "✓" : u.faltam}
              </td>
            </tr>
          ))}
          {totals.porUc.length === 0 && (
            <tr>
              <td colSpan={4} className="py-2 text-muted-foreground">
                Informe a carga horária e aloque as UCs.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border font-semibold">
            <td className="py-1">Total</td>
            <td className="text-center">{totals.totalNecessarias}</td>
            <td className="text-center">{totals.totalAlocadas}</td>
            <td className="text-center">{Math.max(0, totals.totalNecessarias - totals.totalAlocadas)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

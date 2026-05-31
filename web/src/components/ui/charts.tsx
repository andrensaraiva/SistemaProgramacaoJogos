import type { ReactNode } from "react";

// Gráficos leves em SVG/CSS — sem dependências. Bons para dashboards e para
// impressão em PDF (cores via tokens do tema). Mantêm-se simples de propósito:
// barras horizontais, donut de proporção e barra de progresso.

type Tone = "primary" | "success" | "warning" | "danger" | "muted";
const toneVar: Record<Tone, string> = {
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  muted: "var(--muted-foreground)",
};

// --- Barra de progresso (0–100) ----------------------------------------------
export function ProgressBar({
  value,
  tone = "primary",
  label,
}: {
  value: number;
  tone?: Tone;
  label?: ReactNode;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: toneVar[tone] }}
        />
      </div>
    </div>
  );
}

// --- Gráfico de barras horizontais -------------------------------------------
export type BarItem = { label: string; value: number; tone?: Tone };

export function BarChart({
  items,
  unit = "",
  max,
}: {
  items: BarItem[];
  unit?: string;
  max?: number;
}) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex flex-col gap-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-32 shrink-0 truncate text-xs text-muted-foreground" title={it.label}>
            {it.label}
          </div>
          <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
            <div
              className="h-full rounded"
              style={{
                width: `${(it.value / top) * 100}%`,
                backgroundColor: toneVar[it.tone ?? "primary"],
              }}
            />
          </div>
          <div className="w-12 shrink-0 text-right text-xs font-medium tabular-nums">
            {it.value}
            {unit}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Donut de proporção (segmentos) ------------------------------------------
export type DonutSegment = { label: string; value: number; tone: Tone };

export function Donut({
  segments,
  size = 120,
  centerLabel,
}: {
  segments: DonutSegment[];
  size?: number;
  centerLabel?: ReactNode;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  // Pré-calcula o offset acumulado de cada segmento via soma de prefixo
  // (sem mutar variável externa no render).
  const dashes = segments.map((seg) => (seg.value / total) * c);
  const arcs = segments.map((seg, i) => ({
    seg,
    dash: dashes[i],
    offset: dashes.slice(0, i).reduce((s, d) => s + d, 0),
  }));

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={12}
        />
        {arcs.map(({ seg, dash, offset }, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={toneVar[seg.tone]}
            strokeWidth={12}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-offset}
          />
        ))}
      </svg>
      <div className="flex flex-col gap-1 text-sm">
        {centerLabel && <div className="text-lg font-bold">{centerLabel}</div>}
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: toneVar[seg.tone] }}
            />
            <span className="text-muted-foreground">{seg.label}</span>
            <span className="font-medium">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";

// Primitivas visuais compartilhadas pelos 3 editores (pixel/vetor/arte).

export function ToolButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`grid h-9 w-9 place-items-center rounded-lg border text-sm transition-colors ${
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-card text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function Palette({
  colors,
  current,
  onPick,
  onAdd,
}: {
  colors: string[];
  current: string;
  onPick: (c: string) => void;
  onAdd?: (c: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={current}
          onChange={(e) => onPick(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded border border-border bg-transparent"
          title="Cor atual"
        />
        {onAdd && (
          <button
            type="button"
            onClick={() => onAdd(current)}
            className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"
          >
            + paleta
          </button>
        )}
      </div>
      <div className="grid grid-cols-8 gap-1">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c)}
            title={c}
            className={`h-6 w-6 rounded border ${
              c.toLowerCase() === current.toLowerCase() ? "ring-2 ring-primary" : "border-border"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}

export type LayerInfo = { id: string; name: string; visible: boolean };

export function LayersPanel({
  layers,
  activeId,
  onSelect,
  onToggle,
  onAdd,
  onRemove,
  onMove,
  extra,
}: {
  layers: LayerInfo[];
  activeId: string;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  extra?: (id: string) => ReactNode;
}) {
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Camadas
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg border border-border px-2 py-0.5 text-xs hover:bg-muted"
        >
          + nova
        </button>
      </div>
      <ul className="flex flex-col gap-1">
        {[...layers].reverse().map((l) => (
          <li
            key={l.id}
            className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-sm ${
              l.id === activeId ? "border-primary bg-primary/10" : "border-border"
            }`}
          >
            <button type="button" onClick={() => onToggle(l.id)} title="Mostrar/ocultar" className="text-xs">
              {l.visible ? "👁" : "🚫"}
            </button>
            <button type="button" onClick={() => onSelect(l.id)} className="flex-1 truncate text-left">
              {l.name}
            </button>
            {extra?.(l.id)}
            <button type="button" onClick={() => onMove(l.id, 1)} title="Subir" className="text-xs">▲</button>
            <button type="button" onClick={() => onMove(l.id, -1)} title="Descer" className="text-xs">▼</button>
            <button
              type="button"
              onClick={() => onRemove(l.id)}
              title="Remover"
              className="text-xs text-danger"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EditorShell({
  toolbar,
  side,
  children,
}: {
  toolbar: ReactNode;
  side: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-border bg-card p-3">{toolbar}</div>
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="flex-1 overflow-auto rounded-xl border border-border bg-[#1118] p-4">
          {children}
        </div>
        <div className="w-full shrink-0 rounded-xl border border-border bg-card p-3 lg:w-56">
          {side}
        </div>
      </div>
    </div>
  );
}

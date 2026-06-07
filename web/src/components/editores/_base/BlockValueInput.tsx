"use client";

import type { BlockValue } from "@/lib/blocks/types";

// Editor compacto de um valor de bloco: literal (número/texto) ou variável.
// Operadores aninhados ficam de fora deste MVP de UI (o runtime os suporta; a
// condição de "se/enquanto" usa um editor próprio de comparação simples).

const inputCls =
  "rounded border border-white/30 bg-white/90 px-1.5 py-0.5 text-xs text-black w-16 focus:outline-none";

export function BlockValueInput({
  value,
  onChange,
  numeric = false,
  vars = [],
}: {
  value: BlockValue;
  onChange: (v: BlockValue) => void;
  numeric?: boolean;
  vars?: string[];
}) {
  const isVar = value.kind === "var";

  return (
    <span className="inline-flex items-center gap-1">
      {isVar ? (
        <select
          value={value.name}
          onChange={(e) => onChange({ kind: "var", name: e.target.value })}
          className={inputCls}
        >
          {(vars.length ? vars : [value.name]).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={inputCls}
          value={value.kind === "num" ? value.value : value.kind === "text" ? value.value : ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (numeric) onChange({ kind: "num", value: Number(raw) || 0 });
            else onChange({ kind: "text", value: raw });
          }}
        />
      )}
      {vars.length > 0 && (
        <button
          type="button"
          title={isVar ? "usar valor fixo" : "usar variável"}
          onClick={() =>
            isVar
              ? onChange(numeric ? { kind: "num", value: 0 } : { kind: "text", value: "" })
              : onChange({ kind: "var", name: vars[0] })
          }
          className="rounded bg-white/20 px-1 text-[10px]"
        >
          {isVar ? "123" : "𝑥"}
        </button>
      )}
    </span>
  );
}

// Editor de uma comparação simples (a OP b) para condições.
export function ConditionInput({
  value,
  onChange,
  vars = [],
}: {
  value: BlockValue;
  onChange: (v: BlockValue) => void;
  vars?: string[];
}) {
  const cond =
    value.kind === "op"
      ? value
      : ({ kind: "op", op: ">", a: { kind: "num", value: 1 }, b: { kind: "num", value: 0 } } as const);

  return (
    <span className="inline-flex items-center gap-1">
      <BlockValueInput value={cond.a} numeric vars={vars} onChange={(a) => onChange({ ...cond, a })} />
      <select
        value={cond.op}
        onChange={(e) => onChange({ ...cond, op: e.target.value as typeof cond.op })}
        className="rounded border border-white/30 bg-white/90 px-1 py-0.5 text-xs text-black"
      >
        {(["<", ">", "=", "e", "ou"] as const).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <BlockValueInput value={cond.b} numeric vars={vars} onChange={(b) => onChange({ ...cond, b })} />
    </span>
  );
}

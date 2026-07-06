import type { ReactNode } from "react";

type Tone = "default" | "primary" | "success" | "warning" | "danger";

const valueTone: Record<Tone, string> = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

// Halo sutil atrás do ícone, na cor do tom — dá identidade sem poluir.
const iconTone: Record<Tone, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/12 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  danger: "bg-danger/12 text-danger",
};

// Cartão de métrica (KPI). O NÚMERO é o herói (grande, tabular). Ícone opcional
// dá identidade; `hint` é o rótulo secundário. Vira link se `href` for passado.
export function StatCard({
  title,
  value,
  hint,
  tone = "default",
  icon,
  href,
}: {
  title: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium text-muted-foreground">{title}</div>
        {icon && (
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${iconTone[tone]}`} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div className={`mt-2 text-3xl font-bold tnum leading-none ${valueTone[tone]}`}>{value}</div>
      {hint && <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>}
    </>
  );

  const base = "rounded-2xl border border-border bg-card p-5 shadow-e1";
  if (href) {
    // Link precisa ser client-safe; usamos <a> simples (Next injeta prefetch via Link no chamador se quiser).
    return (
      <a href={href} className={`${base} block transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-e2`}>
        {inner}
      </a>
    );
  }
  return <div className={base}>{inner}</div>;
}

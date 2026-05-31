import type { ReactNode } from "react";

type Tone = "default" | "primary" | "success" | "warning" | "danger";

const toneValue: Record<Tone, string> = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

// Cartão de métrica (KPI): título, valor grande e dica. Usado no painel e nos
// dashboards. `tone` colore o valor conforme o significado.
export function StatCard({
  title,
  value,
  hint,
  tone = "default",
}: {
  title: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-sm font-medium text-muted-foreground">{title}</div>
      <div className={`mt-2 text-3xl font-bold ${toneValue[tone]}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

import type { ReactNode } from "react";

// Cartão base do kit visual. Elevação sutil por padrão (shadow-e1) coerente em
// light/dark. `interactive` adiciona hover elevado (para cards clicáveis).
// `tone` pinta uma faixa de severidade à esquerda (estado em forma, não só cor).
type Tone = "danger" | "warning" | "success" | "primary";

const TONE_STRIPE: Record<Tone, string> = {
  danger: "stripe-l stripe-danger",
  warning: "stripe-l stripe-warning",
  success: "stripe-l stripe-success",
  primary: "stripe-l stripe-primary",
};

export function Card({
  children,
  className = "",
  padding = "p-5",
  interactive = false,
  tone,
}: {
  children: ReactNode;
  className?: string;
  padding?: string;
  interactive?: boolean;
  tone?: Tone;
}) {
  const base = "rounded-2xl border border-border bg-card shadow-e1";
  const hover = interactive
    ? "transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-e2"
    : "";
  const stripe = tone ? TONE_STRIPE[tone] : "";
  return (
    <div className={`${base} ${hover} ${stripe} ${padding} ${className}`}>{children}</div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-base font-semibold leading-tight text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

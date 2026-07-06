import type { ReactNode } from "react";

// Rótulo genérico (dificuldade, tipo de exercício, contadores). Para status do
// domínio (presença/submissão) use StatusBadge.
type Tone = "neutral" | "primary" | "accent" | "success" | "warning" | "danger";

const toneClass: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary/15 text-primary",
  accent: "bg-accent/15 text-accent",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
};

const dotClass: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  primary: "bg-primary",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
  dot = false,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  /** Mostra um ponto de status antes do texto (padrão de status pill). */
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClass[tone]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotClass[tone]}`} aria-hidden="true" />}
      {children}
    </span>
  );
}

// Mapa de dificuldade → tom, reutilizável.
export const DIFFICULTY_TONE: Record<string, Tone> = {
  facil: "success",
  medio: "warning",
  dificil: "danger",
  desafio: "primary",
};
export const DIFFICULTY_LABEL: Record<string, string> = {
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
  desafio: "Desafio",
};

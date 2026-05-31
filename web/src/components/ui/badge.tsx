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

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClass[tone]} ${className}`}
    >
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

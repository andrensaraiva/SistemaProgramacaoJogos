import type { ReactNode } from "react";

// Pílula de status reutilizável. Mapeia os status do domínio (presença,
// submissão, entrega) para cores consistentes. Aceita também tom + label livre.
type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const toneClass: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  info: "bg-primary/15 text-primary",
};

// Mapa pronto para os status conhecidos do sistema.
const KNOWN: Record<string, { label: string; tone: Tone }> = {
  // presença
  presente: { label: "Presente", tone: "success" },
  atraso: { label: "Atraso", tone: "warning" },
  falta: { label: "Falta", tone: "danger" },
  // submissão de código
  aprovado: { label: "Aprovado", tone: "success" },
  reprovado: { label: "Reprovado", tone: "danger" },
  rodando: { label: "Rodando", tone: "info" },
  erro: { label: "Erro", tone: "warning" },
  // entrega não-código
  entregue: { label: "Entregue", tone: "info" },
  pendente: { label: "Pendente", tone: "neutral" },
  corrigido: { label: "Corrigido", tone: "success" },
};

export function StatusBadge({
  status,
  label,
  tone,
  className = "",
}: {
  status?: string;
  label?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const known = status ? KNOWN[status] : undefined;
  const finalTone = tone ?? known?.tone ?? "neutral";
  const finalLabel = label ?? known?.label ?? status ?? "—";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClass[finalTone]} ${className}`}
    >
      {finalLabel}
    </span>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";

import type { DesempenhoUc } from "@/lib/dashboard/student";

// Visão gamificada de desempenho por UC — reusada no painel e na tela /desempenho.
// Chips de resumo + uma linha por UC com barra de média colorida pela situação.

export const SIT_LABEL: Record<string, string> = {
  reprovado: "Reprovado",
  recuperacao: "Recuperação",
  aprovado: "Aprovado",
};

const SIT_META: Record<string, { chip: string; bar: string; emoji: string }> = {
  aprovado: { chip: "bg-success/15 text-success", bar: "bg-success", emoji: "✅" },
  recuperacao: { chip: "bg-warning/15 text-warning", bar: "bg-warning", emoji: "⚠️" },
  reprovado: { chip: "bg-danger/15 text-danger", bar: "bg-danger", emoji: "❌" },
};

export function sitMeta(situacao: string) {
  return SIT_META[situacao] ?? { chip: "bg-muted text-muted-foreground", bar: "bg-muted", emoji: "•" };
}

export type Resumo = {
  aprovado: number;
  recuperacao: number;
  reprovado: number;
  freqMedia: number | null;
};

/** Chip de resumo de desempenho: emoji + número grande + rótulo, com gradiente leve. */
export function ResumoChip({
  emoji,
  valor,
  label,
  tone,
  bg,
}: {
  emoji: string;
  valor: ReactNode;
  label: string;
  tone: string;
  bg: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-border bg-gradient-to-br ${bg} to-card p-3`}>
      <span className="text-xl">{emoji}</span>
      <div className="min-w-0">
        <div className={`text-xl font-bold leading-none ${tone}`}>{valor}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

export function ResumoChips({ resumo }: { resumo: Resumo }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <ResumoChip emoji="✅" valor={resumo.aprovado} label="aprovada(s)" tone="text-success" bg="from-success/10" />
      <ResumoChip emoji="⚠️" valor={resumo.recuperacao} label="recuperação" tone="text-warning" bg="from-warning/10" />
      <ResumoChip emoji="❌" valor={resumo.reprovado} label="reprovada(s)" tone="text-danger" bg="from-danger/10" />
      <ResumoChip
        emoji="📅"
        valor={resumo.freqMedia != null ? `${resumo.freqMedia}%` : "—"}
        label="freq. média"
        tone="text-foreground"
        bg="from-muted/40"
      />
    </div>
  );
}

/** Linha de uma UC: nome/turma, barra de média colorida, frequência e situação. */
export function DesempenhoLinha({ d }: { d: DesempenhoUc }) {
  const meta = sitMeta(d.situacao);
  const mediaPct = d.media != null ? Math.min(100, Math.max(0, d.media * 10)) : 0;
  const inner = (
    <div className="group flex flex-col gap-2 rounded-xl border border-border bg-background/40 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 sm:w-48">
        <div className="truncate text-sm font-medium group-hover:text-primary">{d.uc}</div>
        <div className="truncate text-xs text-muted-foreground">{d.turma}</div>
      </div>
      <div className="flex flex-1 items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={`xp-grow h-full rounded-full ${meta.bar}`}
            style={{ ["--xp-target" as string]: `${mediaPct}%` }}
          />
        </div>
        <span className="w-10 shrink-0 text-right text-sm font-bold tabular-nums">
          {d.media != null ? d.media.toFixed(1) : "—"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs ${d.freqBaixa ? "font-medium text-danger" : "text-muted-foreground"}`}>
          {d.freqPct != null ? `${d.freqPct}% freq.` : "—"}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.chip}`}>
          {meta.emoji} {SIT_LABEL[d.situacao] ?? d.situacao}
        </span>
      </div>
    </div>
  );
  return d.classId ? (
    <Link href={`/turmas/${d.classId}/minhas-notas`}>{inner}</Link>
  ) : (
    <div>{inner}</div>
  );
}

/** Lista completa de desempenho por UC (chips + linhas), com estado vazio. */
export function DesempenhoLista({
  desempenho,
  resumo,
}: {
  desempenho: DesempenhoUc[];
  resumo: Resumo;
}) {
  if (desempenho.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
        <span className="text-2xl opacity-50">📭</span>
        Ainda não há notas ou frequência lançadas. Elas aparecem aqui assim que seu professor avaliar.
      </div>
    );
  }
  return (
    <>
      <div className="mb-4">
        <ResumoChips resumo={resumo} />
      </div>
      <div className="flex flex-col gap-2">
        {desempenho.map((d, i) => (
          <DesempenhoLinha key={`${d.uc}-${i}`} d={d} />
        ))}
      </div>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/print-button";
import { BarChart } from "@/components/ui/charts";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireCapability } from "@/lib/auth/guard";
import { getSaepDashboard } from "@/lib/saep/dashboard";

import { PRINT_CSS } from "../../_print";

// Tom para gráficos (charts usam "muted").
function toneFor(pct: number | null) {
  if (pct == null) return "muted" as const;
  if (pct >= 70) return "success" as const;
  if (pct >= 50) return "warning" as const;
  return "danger" as const;
}

// Tom para StatCard (usa "default", não "muted").
function statTone(pct: number | null) {
  if (pct == null) return "default" as const;
  if (pct >= 70) return "success" as const;
  if (pct >= 50) return "warning" as const;
  return "danger" as const;
}

export default async function RelatorioSaepUc({
  params,
}: {
  params: Promise<{ classUnitId: string }>;
}) {
  const { classUnitId } = await params;
  await requireCapability("ver_relatorios");

  const d = await getSaepDashboard(classUnitId);
  if (!d) notFound();

  return (
    <div className="relatorio-page flex flex-col gap-6">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <Link href="/admin/relatorios/saep" className="text-sm text-muted-foreground hover:text-foreground">
          ← SAEP/SAP
        </Link>
        <PrintButton />
      </div>

      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold">
          {d.turma.name} — {d.uc?.title ?? "UC"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {d.totalSimulados} simulado(s) · {d.totalSubmittedAttempts} tentativa(s) ·{" "}
          {d.totalSapAssessments} SAP · {d.totalSapEvaluations} avaliação(ões)
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Desempenho geral" value={d.overall.pct != null ? `${d.overall.pct}%` : "—"} tone={statTone(d.overall.pct)} />
        <StatCard
          title="Teórico"
          value={d.overall.teoricoTotal > 0 ? `${Math.round((d.overall.teoricoCorrect / d.overall.teoricoTotal) * 100)}%` : "—"}
        />
        <StatCard
          title="Prático (SAP)"
          value={d.overall.sapTotal > 0 ? `${Math.round((d.overall.sapCorrect / d.overall.sapTotal) * 100)}%` : "—"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold">Por competência</h2>
          {d.byCompetency.length > 0 ? (
            <BarChart items={d.byCompetency.map((c) => ({ label: c.code, value: c.pct ?? 0, tone: toneFor(c.pct) }))} max={100} />
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados.</p>
          )}
        </div>
        <div className="rounded-xl border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold">Por objeto de conhecimento</h2>
          {d.byKnowledgeObject.length > 0 ? (
            <BarChart items={d.byKnowledgeObject.map((c) => ({ label: c.code, value: c.pct ?? 0, tone: toneFor(c.pct) }))} max={100} />
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados.</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Por aluno (teórico)</h2>
        <Table>
          <THead>
            <TH>Aluno</TH>
            <TH className="text-center">Simulados</TH>
            <TH className="text-center">Respondidas</TH>
            <TH className="text-center">Acertos</TH>
            <TH className="text-center">Desempenho</TH>
          </THead>
          <TBody>
            {d.students.map((s) => (
              <TR key={s.id}>
                <TD className="font-medium">{s.name}</TD>
                <TD className="text-center">{s.attempts}</TD>
                <TD className="text-center">{s.answered}</TD>
                <TD className="text-center">{s.correct}</TD>
                <TD className="text-center">{s.pct != null ? `${s.pct}%` : "—"}</TD>
              </TR>
            ))}
            {d.students.length === 0 && (
              <TR>
                <TD className="text-muted-foreground">Nenhuma tentativa enviada ainda.</TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}

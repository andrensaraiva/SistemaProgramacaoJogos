import Link from "next/link";

import { PrintButton } from "@/components/print-button";
import { BarChart } from "@/components/ui/charts";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireCapability } from "@/lib/auth/guard";
import { getSaepInstitutional } from "@/lib/reports/saep";

import { PRINT_CSS } from "../_print";

// Tom para BarChart (charts usam "muted").
function tone(pct: number | null) {
  if (pct == null) return "muted" as const;
  if (pct >= 70) return "success" as const;
  if (pct >= 50) return "warning" as const;
  return "danger" as const;
}

// Tom para StatCard (usa "default").
function statTone(pct: number | null) {
  if (pct == null) return "default" as const;
  if (pct >= 70) return "success" as const;
  if (pct >= 50) return "warning" as const;
  return "danger" as const;
}

export default async function RelatorioSaep() {
  await requireCapability("ver_relatorios");

  const r = await getSaepInstitutional();
  const hoje = new Date().toLocaleDateString("pt-BR");
  const piores = r.byCompetency.filter((c) => c.pct != null).slice(0, 3);

  return (
    <div className="relatorio-page flex flex-col gap-6">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <Link href="/admin/relatorios" className="text-sm text-muted-foreground hover:text-foreground">
          ← Relatórios
        </Link>
        <div className="flex gap-2">
          {/* Download de CSV (route handler), não navegação de página. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/admin/relatorios/saep/export">
            <Button variant="secondary">Exportar CSV</Button>
          </a>
          <PrintButton />
        </div>
      </div>

      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold">SAEP / SAP — desempenho institucional</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Teórico (simulados) + prático (SAP) por competência · Emitido em {hoje}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Desempenho geral" value={r.overall.pct != null ? `${r.overall.pct}%` : "—"} tone={statTone(r.overall.pct)} />
        <StatCard title="Teórico (SAEP)" value={r.overall.teoricoPct != null ? `${r.overall.teoricoPct}%` : "—"} hint={`${r.totals.attempts} tentativa(s)`} />
        <StatCard title="Prático (SAP)" value={r.overall.sapPct != null ? `${r.overall.sapPct}%` : "—"} hint={`${r.totals.sapEvaluations} avaliação(ões)`} />
        <StatCard title="Turmas × UC com SAEP/SAP" value={r.totals.classUnitsComSaep} />
      </div>

      {piores.length > 0 && (
        <div className="rounded-xl border border-border bg-warning/5 p-4">
          <h2 className="mb-1 text-sm font-semibold">Pontos a reforçar (institucional)</h2>
          <p className="text-sm text-muted-foreground">
            {piores.map((c) => `${c.code} (${c.pct}%)`).join(" · ")}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold">Desempenho por competência (teórico + prático)</h2>
        {r.byCompetency.length > 0 ? (
          <BarChart
            items={r.byCompetency.map((c) => ({
              label: c.code,
              value: c.pct ?? 0,
              tone: tone(c.pct),
            }))}
            max={100}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Sem dados de SAEP/SAP ainda.</p>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Por turma × UC (clique para detalhar)</h2>
        <Table>
          <THead>
            <TH>Turma</TH>
            <TH>UC</TH>
            <TH className="text-center">Desempenho</TH>
            <TH className="text-center">Tentativas</TH>
            <TH className="text-center">Avaliações SAP</TH>
            <TH></TH>
          </THead>
          <TBody>
            {r.ucs.map((u) => (
              <TR key={u.classUnitId}>
                <TD className="font-medium">{u.turma}</TD>
                <TD>{u.uc}</TD>
                <TD className="text-center">{u.pct != null ? `${u.pct}%` : "—"}</TD>
                <TD className="text-center">{u.attempts}</TD>
                <TD className="text-center">{u.sapEvaluations}</TD>
                <TD className="text-center no-print">
                  <Link
                    href={`/admin/relatorios/saep/${u.classUnitId}`}
                    className="text-sm text-primary hover:underline"
                  >
                    Detalhar
                  </Link>
                </TD>
              </TR>
            ))}
            {r.ucs.length === 0 && (
              <TR>
                <TD className="text-muted-foreground">Nenhuma turma com SAEP/SAP ainda.</TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}

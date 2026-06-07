import Link from "next/link";

import { PrintButton } from "@/components/print-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireCapability } from "@/lib/auth/guard";
import { getProjectsReport } from "@/lib/reports/projects";

import { PRINT_CSS } from "../_print";

function tone(pct: number | null) {
  if (pct == null) return "neutral" as const;
  if (pct >= 70) return "success" as const;
  if (pct >= 30) return "warning" as const;
  return "danger" as const;
}

export default async function RelatorioProjetos() {
  await requireCapability("ver_relatorios");

  const r = await getProjectsReport();
  const hoje = new Date().toLocaleDateString("pt-BR");

  return (
    <div className="relatorio-page flex flex-col gap-6">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <Link href="/admin/relatorios" className="text-sm text-muted-foreground hover:text-foreground">
          ← Relatórios
        </Link>
        <div className="flex gap-2">
          <a href="/admin/relatorios/projetos/export">
            <Button variant="secondary">Exportar CSV</Button>
          </a>
          <PrintButton />
        </div>
      </div>

      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold">Projetos Integradores — desempenho</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Progresso por grupo (tarefas concluídas no board) · Emitido em {hoje}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Projetos" value={r.totals.projetos} tone="primary" />
        <StatCard title="Grupos" value={r.totals.grupos} />
        <StatCard title="Conclusão média" value={r.totals.pctMedio != null ? `${r.totals.pctMedio}%` : "—"} />
        <StatCard title="Grupos parados" value={r.totals.gruposParados} tone={r.totals.gruposParados ? "warning" : "default"} hint="0 tarefas concluídas" />
      </div>

      <Table>
        <THead>
          <TH>Turma</TH>
          <TH>UC</TH>
          <TH>Projeto</TH>
          <TH>Grupo</TH>
          <TH className="text-center">Tarefas</TH>
          <TH className="text-center">Concluídas</TH>
          <TH className="text-center">Progresso</TH>
        </THead>
        <TBody>
          {r.groups.map((g, i) => (
            <TR key={`${g.projectId}-${g.grupo}-${i}`}>
              <TD>{g.turma}</TD>
              <TD>{g.uc}</TD>
              <TD className="font-medium">{g.projeto}</TD>
              <TD>{g.grupo}</TD>
              <TD className="text-center">{g.totalTasks}</TD>
              <TD className="text-center">{g.concluidas}</TD>
              <TD className="text-center">
                <Badge tone={tone(g.pct)}>{g.pct != null ? `${g.pct}%` : "—"}</Badge>
                {g.parado && <span className="ml-1 text-xs text-danger">parado</span>}
              </TD>
            </TR>
          ))}
          {r.groups.length === 0 && (
            <TR>
              <TD className="text-muted-foreground">Nenhum projeto integrador com grupos ainda.</TD>
            </TR>
          )}
        </TBody>
      </Table>
    </div>
  );
}

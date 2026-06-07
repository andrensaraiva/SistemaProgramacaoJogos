import Link from "next/link";

import { PrintButton } from "@/components/print-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireCapability } from "@/lib/auth/guard";
import { getTeachersReport } from "@/lib/reports/teachers";

import { PRINT_CSS } from "../_print";

function pctTone(pct: number | null) {
  if (pct == null) return "neutral" as const;
  if (pct >= 70) return "success" as const;
  if (pct >= 40) return "warning" as const;
  return "danger" as const;
}

export default async function RelatorioProfessores() {
  await requireCapability("ver_relatorios");

  const rows = await getTeachersReport();
  const hoje = new Date().toLocaleDateString("pt-BR");

  return (
    <div className="relatorio-page flex flex-col gap-6">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <Link href="/admin/relatorios" className="text-sm text-muted-foreground hover:text-foreground">
          ← Relatórios
        </Link>
        <div className="flex gap-2">
          <a href="/admin/relatorios/professores/export">
            <Button variant="secondary">Exportar CSV</Button>
          </a>
          <PrintButton />
        </div>
      </div>

      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold">Acompanhamento dos professores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Emitido em {hoje}. Execução = aulas com frequência lançada ÷ aulas planejadas
          (maior aula do plano). Plano = UCs com plano de aula montado.
        </p>
      </div>

      <Table>
        <THead>
          <TH>Professor</TH>
          <TH className="text-center">Turmas</TH>
          <TH className="text-center">UCs</TH>
          <TH className="text-center">Com plano</TH>
          <TH className="text-center">UCs c/ frequência</TH>
          <TH className="text-center">Execução do plano</TH>
          <TH className="text-center">Atividades</TH>
          <TH className="text-center">Satisfação</TH>
        </THead>
        <TBody>
          {rows.map((r) => (
            <TR key={r.id}>
              <TD className="font-medium">
                {r.nome} {r.suspenso && <span className="text-xs text-danger">(suspenso)</span>}
              </TD>
              <TD className="text-center">{r.turmas}</TD>
              <TD className="text-center">{r.classUnits}</TD>
              <TD className="text-center">
                {r.comPlano}/{r.classUnits || 0}
              </TD>
              <TD className="text-center">
                {r.ucsComFrequencia}/{r.classUnits || 0}
              </TD>
              <TD className="text-center">
                <Badge tone={pctTone(r.execucaoPct)}>
                  {r.execucaoPct != null ? `${r.execucaoPct}%` : "—"}
                </Badge>
                {r.aulasPlanejadas > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({r.aulasDadas}/{r.aulasPlanejadas})
                  </span>
                )}
              </TD>
              <TD className="text-center">{r.atividades}</TD>
              <TD className="text-center">
                {r.feedbackAvg != null ? (
                  <span title={`${r.feedbackTotal} avaliação(ões)`}>
                    <span className="text-warning">★</span> {r.feedbackAvg}
                  </span>
                ) : (
                  "—"
                )}
              </TD>
            </TR>
          ))}
          {rows.length === 0 && (
            <TR>
              <TD className="text-muted-foreground">Nenhum professor cadastrado.</TD>
            </TR>
          )}
        </TBody>
      </Table>
    </div>
  );
}

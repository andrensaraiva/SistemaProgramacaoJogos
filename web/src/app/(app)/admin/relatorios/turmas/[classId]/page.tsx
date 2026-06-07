import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireCapability } from "@/lib/auth/guard";
import { getClassReport } from "@/lib/reports/classReport";

import { PRINT_CSS } from "../../_print";

export default async function RelatorioTurma({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  await requireCapability("ver_relatorios");

  const report = await getClassReport(classId);
  if (!report) notFound();

  const hoje = new Date().toLocaleDateString("pt-BR");

  return (
    <div className="relatorio-page flex flex-col gap-6">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <Link href="/admin/relatorios/turmas" className="text-sm text-muted-foreground hover:text-foreground">
          ← Turmas
        </Link>
        <div className="flex gap-2">
          <a href={`/admin/relatorios/turmas/${classId}/export`}>
            <Button variant="secondary">Exportar CSV</Button>
          </a>
          <PrintButton />
        </div>
      </div>

      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold">Relatório da turma — {report.turma}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Prof. {report.professor ?? "—"} · {report.totalAlunosTurma} aluno(s) · Emitido em {hoje}
        </p>
      </div>

      <Table>
        <THead>
          <TH>UC</TH>
          <TH className="text-center">Alunos</TH>
          <TH className="text-center">Aulas</TH>
          <TH className="text-center">Freq. média</TH>
          <TH className="text-center">Média</TH>
          <TH className="text-center">Aprov.</TH>
          <TH className="text-center">Recup.</TH>
          <TH className="text-center">Reprov.</TH>
          <TH className="text-center">Sem nota</TH>
        </THead>
        <TBody>
          {report.ucs.map((u) => (
            <TR key={u.classUnitId}>
              <TD className="font-medium">{u.uc}</TD>
              <TD className="text-center">{u.totalAlunos}</TD>
              <TD className="text-center">{u.totalAulas}</TD>
              <TD className="text-center">{u.freqMediaPct != null ? `${u.freqMediaPct}%` : "—"}</TD>
              <TD className="text-center">{u.mediaGeral ?? "—"}</TD>
              <TD className="text-center text-success">{u.aprovados}</TD>
              <TD className="text-center text-warning">{u.recuperacao}</TD>
              <TD className="text-center text-danger">{u.reprovados}</TD>
              <TD className="text-center text-muted-foreground">{u.semNota}</TD>
            </TR>
          ))}
          {report.ucs.length === 0 && (
            <TR>
              <TD className="text-muted-foreground">Esta turma ainda não tem UCs vinculadas.</TD>
            </TR>
          )}
        </TBody>
      </Table>
    </div>
  );
}

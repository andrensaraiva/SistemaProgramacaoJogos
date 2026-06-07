import Link from "next/link";

import { PrintButton } from "@/components/print-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireCapability } from "@/lib/auth/guard";
import { listarTurmas } from "@/lib/admin/actions";
import { situacaoLabel, situacaoTone, type Situacao } from "@/lib/reports/grading";
import { getStudentsReport, type StudentsReportFilter } from "@/lib/reports/students";

function badgeTone(s: Situacao) {
  const t = situacaoTone(s);
  return t === "default" ? ("neutral" as const) : t;
}

const SIT_OPTS: { value: string; label: string }[] = [
  { value: "", label: "Todas as situações" },
  { value: "em_risco", label: "Em risco (recup. + reprov.)" },
  { value: "reprovado", label: "Reprovados" },
  { value: "recuperacao", label: "Recuperação" },
  { value: "aprovado", label: "Aprovados" },
];

export default async function RelatorioAlunos({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; situacao?: string; freqBaixa?: string }>;
}) {
  await requireCapability("ver_relatorios");

  const sp = await searchParams;
  const filter: StudentsReportFilter = {
    classId: sp.classId || undefined,
    situacao: (sp.situacao as StudentsReportFilter["situacao"]) || undefined,
    freqBaixa: sp.freqBaixa === "1",
  };

  const [turmas, rows] = await Promise.all([
    listarTurmas(),
    getStudentsReport(filter),
  ]);

  const exportQs = new URLSearchParams();
  if (filter.classId) exportQs.set("classId", filter.classId);
  if (sp.situacao) exportQs.set("situacao", sp.situacao);
  if (filter.freqBaixa) exportQs.set("freqBaixa", "1");

  return (
    <div className="relatorio-page flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <Link href="/admin/relatorios" className="text-sm text-muted-foreground hover:text-foreground">
          ← Relatórios
        </Link>
        <div className="flex gap-2">
          <a href={`/admin/relatorios/alunos/export?${exportQs.toString()}`}>
            <Button variant="secondary">Exportar CSV</Button>
          </a>
          <PrintButton />
        </div>
      </div>

      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold">Situação dos alunos por UC</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} registro(s) (aluno × UC). Use os filtros para focar em quem precisa de atenção.
        </p>
      </div>

      {/* Filtros (GET) */}
      <form className="flex flex-wrap items-end gap-3 no-print" method="get">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Turma</span>
          <select name="classId" defaultValue={filter.classId ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">Todas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Situação</span>
          <select name="situacao" defaultValue={sp.situacao ?? ""} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {SIT_OPTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="freqBaixa" value="1" defaultChecked={filter.freqBaixa} />
          Só frequência baixa
        </label>
        <Button type="submit" variant="secondary">Filtrar</Button>
      </form>

      <Table>
        <THead>
          <TH>Aluno</TH>
          <TH>Turma</TH>
          <TH>UC</TH>
          <TH className="text-center">Frequência</TH>
          <TH className="text-center">Faltas</TH>
          <TH className="text-center">Média</TH>
          <TH className="text-center">Situação</TH>
        </THead>
        <TBody>
          {rows.map((r) => (
            <TR key={`${r.alunoId}-${r.classUnitId}`}>
              <TD className="font-medium">{r.aluno}</TD>
              <TD>{r.turma}</TD>
              <TD>{r.uc}</TD>
              <TD className="text-center">
                <span className={r.freqBaixa ? "text-danger font-medium" : ""}>
                  {r.freqPct != null ? `${r.freqPct}%` : "—"}
                </span>
              </TD>
              <TD className="text-center">{r.faltas}</TD>
              <TD className="text-center">{r.media ?? "—"}</TD>
              <TD className="text-center">
                <Badge tone={badgeTone(r.situacao)}>{situacaoLabel(r.situacao)}</Badge>
              </TD>
            </TR>
          ))}
          {rows.length === 0 && (
            <TR>
              <TD className="text-muted-foreground">Nenhum registro para os filtros escolhidos.</TD>
            </TR>
          )}
        </TBody>
      </Table>
    </div>
  );
}

import { type NextRequest, NextResponse } from "next/server";

import { canCapability } from "@/lib/auth/guard";
import { csvFilename, toCsv } from "@/lib/reports/csv";
import { situacaoLabel } from "@/lib/reports/grading";
import { getStudentsReport, type StudentsReportFilter } from "@/lib/reports/students";

export async function GET(request: NextRequest) {
  if (!(await canCapability("ver_relatorios"))) {
    return new NextResponse("Acesso negado", { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const filter: StudentsReportFilter = {
    classId: sp.get("classId") || undefined,
    situacao: (sp.get("situacao") as StudentsReportFilter["situacao"]) || undefined,
    freqBaixa: sp.get("freqBaixa") === "1",
  };

  const rows = await getStudentsReport(filter);
  const csv = toCsv(
    ["Aluno", "Turma", "UC", "Frequência (%)", "Faltas", "Média", "Situação"],
    rows.map((r) => [
      r.aluno,
      r.turma,
      r.uc,
      r.freqPct ?? "",
      r.faltas,
      r.media ?? "",
      situacaoLabel(r.situacao),
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename("relatorio-alunos")}"`,
    },
  });
}

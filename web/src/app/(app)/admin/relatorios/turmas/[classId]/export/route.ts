import { type NextRequest, NextResponse } from "next/server";

import { canCapability } from "@/lib/auth/guard";
import { csvFilename, toCsv } from "@/lib/reports/csv";
import { getClassReport } from "@/lib/reports/classReport";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ classId: string }> },
) {
  if (!(await canCapability("ver_relatorios"))) {
    return new NextResponse("Acesso negado", { status: 403 });
  }

  const { classId } = await params;
  const report = await getClassReport(classId);
  if (!report) return new NextResponse("Turma não encontrada", { status: 404 });

  const csv = toCsv(
    ["UC", "Alunos", "Aulas", "Freq. média (%)", "Média", "Aprovados", "Recuperação", "Reprovados", "Sem nota"],
    report.ucs.map((u) => [
      u.uc,
      u.totalAlunos,
      u.totalAulas,
      u.freqMediaPct ?? "",
      u.mediaGeral ?? "",
      u.aprovados,
      u.recuperacao,
      u.reprovados,
      u.semNota,
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(`relatorio-turma-${report.turma}`)}"`,
    },
  });
}

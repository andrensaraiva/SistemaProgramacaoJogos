import { NextResponse } from "next/server";

import { canCapability } from "@/lib/auth/guard";
import { csvFilename, toCsv } from "@/lib/reports/csv";
import { getTeachersReport } from "@/lib/reports/teachers";

export async function GET() {
  if (!(await canCapability("ver_relatorios"))) {
    return new NextResponse("Acesso negado", { status: 403 });
  }

  const rows = await getTeachersReport();
  const csv = toCsv(
    [
      "Professor",
      "Situação",
      "Turmas",
      "UCs",
      "UCs com plano",
      "UCs com frequência",
      "Aulas dadas",
      "Aulas planejadas",
      "Execução do plano (%)",
      "Atividades criadas",
      "Satisfação (média)",
      "Avaliações recebidas",
    ],
    rows.map((r) => [
      r.nome,
      r.suspenso ? "Suspenso" : "Ativo",
      r.turmas,
      r.classUnits,
      r.comPlano,
      r.ucsComFrequencia,
      r.aulasDadas,
      r.aulasPlanejadas,
      r.execucaoPct ?? "",
      r.atividades,
      r.feedbackAvg ?? "",
      r.feedbackTotal,
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename("relatorio-professores")}"`,
    },
  });
}

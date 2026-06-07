import { NextResponse } from "next/server";

import { canCapability } from "@/lib/auth/guard";
import { csvFilename, toCsv } from "@/lib/reports/csv";
import { getProjectsReport } from "@/lib/reports/projects";

export async function GET() {
  if (!(await canCapability("ver_relatorios"))) {
    return new NextResponse("Acesso negado", { status: 403 });
  }

  const r = await getProjectsReport();
  const csv = toCsv(
    ["Turma", "UC", "Projeto", "Grupo", "Tarefas", "Concluídas", "Fazendo", "A fazer", "Progresso (%)", "Parado"],
    r.groups.map((g) => [
      g.turma,
      g.uc,
      g.projeto,
      g.grupo,
      g.totalTasks,
      g.concluidas,
      g.fazendo,
      g.aFazer,
      g.pct ?? "",
      g.parado ? "Sim" : "Não",
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename("relatorio-projetos-integradores")}"`,
    },
  });
}

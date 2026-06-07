import { NextResponse } from "next/server";

import { canCapability } from "@/lib/auth/guard";
import { csvFilename, toCsv } from "@/lib/reports/csv";
import { getSaepInstitutional } from "@/lib/reports/saep";

export async function GET() {
  if (!(await canCapability("ver_relatorios"))) {
    return new NextResponse("Acesso negado", { status: 403 });
  }

  const r = await getSaepInstitutional();
  const csv = toCsv(
    ["Turma", "UC", "Desempenho (%)", "Sinais", "Acertos", "Simulados", "Tentativas", "Avaliações SAP"],
    r.ucs.map((u) => [
      u.turma,
      u.uc,
      u.pct ?? "",
      u.total,
      u.correct,
      u.simulados,
      u.attempts,
      u.sapEvaluations,
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename("relatorio-saep-sap")}"`,
    },
  });
}

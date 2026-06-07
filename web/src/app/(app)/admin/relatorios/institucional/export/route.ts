import { NextResponse } from "next/server";

import { canCapability } from "@/lib/auth/guard";
import { csvFilename, toCsv } from "@/lib/reports/csv";
import { getInstitutionalReport } from "@/lib/reports/institutional";

export async function GET() {
  if (!(await canCapability("ver_relatorios"))) {
    return new NextResponse("Acesso negado", { status: 403 });
  }

  const inst = await getInstitutionalReport();
  const csv = toCsv(
    ["Indicador", "Valor"],
    [
      ["Professores", inst.totais.professores],
      ["Alunos", inst.totais.alunos],
      ["Turmas", inst.totais.turmas],
      ["Cursos", inst.totais.cursos],
      ["Turmas x UC", inst.totais.classUnits],
      ["Aprovados (aluno x UC)", inst.situacao.aprovado],
      ["Recuperação (aluno x UC)", inst.situacao.recuperacao],
      ["Reprovados (aluno x UC)", inst.situacao.reprovado],
      ["Sem nota (aluno x UC)", inst.situacao.semNota],
      ["Frequência média global (%)", inst.freqMediaGlobalPct ?? ""],
      ["Matrículas com frequência baixa", inst.alunosFreqBaixa],
    ],
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename("relatorio-institucional")}"`,
    },
  });
}

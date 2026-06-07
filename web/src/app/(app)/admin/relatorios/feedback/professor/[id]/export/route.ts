import { type NextRequest, NextResponse } from "next/server";

import { canCapability } from "@/lib/auth/guard";
import { csvFilename, toCsv } from "@/lib/reports/csv";
import { getProfessorFeedback } from "@/lib/reports/feedback";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await canCapability("ver_relatorios"))) return new NextResponse("Acesso negado", { status: 403 });
  const { id } = await params;
  const r = await getProfessorFeedback(id);
  if (!r) return new NextResponse("Não encontrado", { status: 404 });

  // Bloco 1: médias por turma. Bloco 2: comentários.
  const rows: (string | number)[][] = [
    ["RESUMO", "", ""],
    ["Média geral", r.resumo.average ?? "", ""],
    ["Total de avaliações", r.resumo.total, ""],
    ["", "", ""],
    ["POR TURMA", "Média", "Avaliações"],
    ...r.porTurma.map((t) => [t.turma, t.media ?? "", t.total]),
    ["", "", ""],
    ["COMENTÁRIOS (anônimos)", "Estrelas", ""],
    ...r.resumo.comments.map((c) => [c.comment, c.rating, ""]),
  ];

  const csv = toCsv(["Feedback de " + r.nome, "", ""], rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(`feedback-${r.nome}`)}"`,
    },
  });
}

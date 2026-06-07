import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getUcStats } from "@/lib/dashboard/uc-stats";

import { situacao, type Situacao } from "./grading";
import { getInstitutionSettings } from "./settings";

// Relatório de alunos por UC: situação (aprovado/recuperação/reprovado) e flag de
// frequência baixa. Percorre as class_units (turma×UC) e reaproveita getUcStats.

export type StudentRow = {
  classUnitId: string;
  turma: string;
  uc: string;
  alunoId: string;
  aluno: string;
  freqPct: number | null;
  faltas: number;
  media: number | null;
  situacao: Situacao;
  freqBaixa: boolean;
};

export type StudentsReportFilter = {
  classId?: string;
  situacao?: Situacao | "em_risco"; // em_risco = recuperação OU reprovado
  freqBaixa?: boolean;
};

export async function getStudentsReport(
  filter: StudentsReportFilter = {},
): Promise<StudentRow[]> {
  const admin = createAdminClient();
  const { thresholds } = await getInstitutionSettings();

  let cuQuery = admin.from("class_units").select("id, class_id");
  if (filter.classId) cuQuery = cuQuery.eq("class_id", filter.classId);
  const { data: classUnits } = await cuQuery;

  const rows: StudentRow[] = [];

  for (const cu of classUnits ?? []) {
    const stats = await getUcStats(cu.id);
    if (!stats) continue;

    for (const a of stats.alunos) {
      const sit = situacao(a.mediaNota, a.presencaPct, thresholds);
      const freqBaixa = a.presencaPct != null && a.presencaPct < thresholds.freqMinPct;

      rows.push({
        classUnitId: cu.id,
        turma: stats.turma.name,
        uc: stats.uc?.title ?? "UC",
        alunoId: a.id,
        aluno: a.name,
        freqPct: a.presencaPct,
        faltas: a.faltas,
        media: a.mediaNota,
        situacao: sit,
        freqBaixa,
      });
    }
  }

  // Filtros de situação / frequência.
  let result = rows;
  if (filter.situacao === "em_risco") {
    result = result.filter((r) => r.situacao === "recuperacao" || r.situacao === "reprovado");
  } else if (filter.situacao) {
    result = result.filter((r) => r.situacao === filter.situacao);
  }
  if (filter.freqBaixa) {
    result = result.filter((r) => r.freqBaixa);
  }

  // Ordena: reprovados primeiro, depois recuperação, depois por turma/aluno.
  const ordem: Record<Situacao, number> = {
    reprovado: 0,
    recuperacao: 1,
    sem_nota: 2,
    aprovado: 3,
  };
  result.sort(
    (a, b) =>
      ordem[a.situacao] - ordem[b.situacao] ||
      a.turma.localeCompare(b.turma) ||
      a.aluno.localeCompare(b.aluno),
  );

  return result;
}

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getUcStats } from "@/lib/dashboard/uc-stats";

import { situacao, type Situacao } from "./grading";
import { getInstitutionSettings } from "./settings";

// Relatório consolidado de uma TURMA: uma linha por UC (turma×UC) com frequência
// média, média de notas e distribuição de situação dos alunos.

export type ClassUcRow = {
  classUnitId: string;
  uc: string;
  totalAlunos: number;
  totalAulas: number;
  freqMediaPct: number | null;
  mediaGeral: number | null;
  aprovados: number;
  recuperacao: number;
  reprovados: number;
  semNota: number;
};

export type ClassReport = {
  classId: string;
  turma: string;
  professor: string | null;
  ucs: ClassUcRow[];
  totalAlunosTurma: number;
};

export async function getClassReport(classId: string): Promise<ClassReport | null> {
  const admin = createAdminClient();
  const { thresholds } = await getInstitutionSettings();

  const { data: turma } = await admin
    .from("classes")
    .select("id, name, owner:profiles!owner_id(display_name)")
    .eq("id", classId)
    .single();
  if (!turma) return null;

  const { data: classUnits } = await admin
    .from("class_units")
    .select("id")
    .eq("class_id", classId);

  const { count: totalAlunosTurma } = await admin
    .from("class_members")
    .select("student_id", { count: "exact", head: true })
    .eq("class_id", classId);

  const ucs: ClassUcRow[] = [];
  for (const cu of classUnits ?? []) {
    const stats = await getUcStats(cu.id);
    if (!stats) continue;

    let aprovados = 0;
    let recuperacao = 0;
    let reprovados = 0;
    let semNota = 0;
    for (const a of stats.alunos) {
      const sit: Situacao = situacao(a.mediaNota, a.presencaPct, thresholds);
      if (sit === "aprovado") aprovados++;
      else if (sit === "recuperacao") recuperacao++;
      else if (sit === "reprovado") reprovados++;
      else semNota++;
    }

    ucs.push({
      classUnitId: cu.id,
      uc: stats.uc?.title ?? "UC",
      totalAlunos: stats.totalAlunos,
      totalAulas: stats.totalAulas,
      freqMediaPct: stats.freqMediaPct,
      mediaGeral: stats.mediaGeral,
      aprovados,
      recuperacao,
      reprovados,
      semNota,
    });
  }

  ucs.sort((a, b) => a.uc.localeCompare(b.uc));

  return {
    classId,
    turma: turma.name,
    professor:
      (turma.owner as unknown as { display_name: string } | null)?.display_name ?? null,
    ucs,
    totalAlunosTurma: totalAlunosTurma ?? 0,
  };
}

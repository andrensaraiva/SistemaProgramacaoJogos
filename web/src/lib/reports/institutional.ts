import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { getStudentsReport } from "./students";

// Panorama institucional: totais + distribuição de situação (somando todas as
// turmas×UC) + frequência média global. Reusa getStudentsReport para a situação.

export type InstitutionalReport = {
  totais: {
    professores: number;
    alunos: number;
    turmas: number;
    cursos: number;
    classUnits: number;
  };
  situacao: {
    aprovado: number;
    recuperacao: number;
    reprovado: number;
    semNota: number;
    total: number;
  };
  freqMediaGlobalPct: number | null;
  alunosFreqBaixa: number; // matrículas (aluno×UC) com frequência abaixo do mínimo
};

async function headCount(q: PromiseLike<{ count: number | null }>): Promise<number> {
  return (await q).count ?? 0;
}

export async function getInstitutionalReport(): Promise<InstitutionalReport> {
  const admin = createAdminClient();

  const [professores, alunos, turmas, cursos, classUnits] = await Promise.all([
    headCount(admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "professor")),
    headCount(admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "aluno")),
    headCount(admin.from("classes").select("id", { count: "exact", head: true })),
    headCount(admin.from("courses").select("id", { count: "exact", head: true })),
    headCount(admin.from("class_units").select("id", { count: "exact", head: true })),
  ]);

  const linhas = await getStudentsReport();

  const situacao = { aprovado: 0, recuperacao: 0, reprovado: 0, semNota: 0, total: linhas.length };
  let somaFreq = 0;
  let comFreq = 0;
  let alunosFreqBaixa = 0;
  for (const r of linhas) {
    if (r.situacao === "aprovado") situacao.aprovado++;
    else if (r.situacao === "recuperacao") situacao.recuperacao++;
    else if (r.situacao === "reprovado") situacao.reprovado++;
    else situacao.semNota++;
    if (r.freqPct != null) {
      somaFreq += r.freqPct;
      comFreq++;
    }
    if (r.freqBaixa) alunosFreqBaixa++;
  }

  return {
    totais: { professores, alunos, turmas, cursos, classUnits },
    situacao,
    freqMediaGlobalPct: comFreq > 0 ? Math.round(somaFreq / comFreq) : null,
    alunosFreqBaixa,
  };
}

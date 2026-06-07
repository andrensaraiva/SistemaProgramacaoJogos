import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSaepDashboard, type TagStat } from "@/lib/saep/dashboard";

// Relatório SAEP/SAP institucional: agrega o desempenho de TODAS as turmas×UC que
// têm SAEP teórico (simulados) e/ou SAP prático (assessments), reusando o
// getSaepDashboard por UC. Visão por competência (combinada) + split teórico/
// prático no geral + lista de turmas×UC para drill-down.

export type SaepUcRow = {
  classUnitId: string;
  turma: string;
  uc: string;
  total: number; // sinais (respostas + itens)
  correct: number;
  pct: number | null;
  simulados: number;
  attempts: number;
  sapEvaluations: number;
};

export type SaepInstitutional = {
  totals: {
    classUnitsComSaep: number;
    simulados: number;
    attempts: number;
    sapAssessments: number;
    sapEvaluations: number;
  };
  overall: {
    pct: number | null;
    teoricoPct: number | null;
    sapPct: number | null;
  };
  byCompetency: TagStat[]; // combinada (teórico + prático), pior primeiro
  ucs: SaepUcRow[]; // ordenado por pior pct
};

function pct(correct: number, total: number): number | null {
  return total > 0 ? Math.round((correct / total) * 100) : null;
}

export async function getSaepInstitutional(): Promise<SaepInstitutional> {
  const admin = createAdminClient();

  // Quais class_units têm simulado OU assessment? (evita varrer UCs vazias)
  const [{ data: sims }, { data: assess }] = await Promise.all([
    admin.from("quiz_simulados").select("class_unit_id"),
    admin.from("sap_assessments").select("class_unit_id"),
  ]);
  const cuIds = new Set<string>();
  for (const s of sims ?? []) if (s.class_unit_id) cuIds.add(s.class_unit_id);
  for (const a of assess ?? []) if (a.class_unit_id) cuIds.add(a.class_unit_id);

  const compAcc = new Map<string, TagStat>();
  const ucs: SaepUcRow[] = [];
  const totals = { classUnitsComSaep: 0, simulados: 0, attempts: 0, sapAssessments: 0, sapEvaluations: 0 };
  let teoricoTotal = 0;
  let teoricoCorrect = 0;
  let sapTotal = 0;
  let sapCorrect = 0;

  for (const cuId of cuIds) {
    const d = await getSaepDashboard(cuId);
    if (!d) continue;

    totals.classUnitsComSaep += 1;
    totals.simulados += d.totalSimulados;
    totals.attempts += d.totalSubmittedAttempts;
    totals.sapAssessments += d.totalSapAssessments;
    totals.sapEvaluations += d.totalSapEvaluations;

    teoricoTotal += d.overall.teoricoTotal;
    teoricoCorrect += d.overall.teoricoCorrect;
    sapTotal += d.overall.sapTotal;
    sapCorrect += d.overall.sapCorrect;

    // Soma por competência (combinada).
    for (const c of d.byCompetency) {
      const cur = compAcc.get(c.code) ?? { code: c.code, label: c.label, total: 0, correct: 0, pct: null };
      cur.total += c.total;
      cur.correct += c.correct;
      compAcc.set(c.code, cur);
    }

    ucs.push({
      classUnitId: cuId,
      turma: d.turma.name,
      uc: d.uc?.title ?? "UC",
      total: d.overall.total,
      correct: d.overall.correct,
      pct: d.overall.pct,
      simulados: d.totalSimulados,
      attempts: d.totalSubmittedAttempts,
      sapEvaluations: d.totalSapEvaluations,
    });
  }

  const byCompetency = [...compAcc.values()]
    .map((c) => ({ ...c, pct: pct(c.correct, c.total) }))
    .sort((a, b) => (a.pct ?? 999) - (b.pct ?? 999)); // pior primeiro

  ucs.sort((a, b) => (a.pct ?? 999) - (b.pct ?? 999));

  return {
    totals,
    overall: {
      pct: pct(teoricoCorrect + sapCorrect, teoricoTotal + sapTotal),
      teoricoPct: pct(teoricoCorrect, teoricoTotal),
      sapPct: pct(sapCorrect, sapTotal),
    },
    byCompetency,
    ucs,
  };
}

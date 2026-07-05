import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { SURVEY_TOPICS, type SurveyTopic } from "./eligibility";

// Agregado ANÔNIMO das pesquisas de UC — para o coordenador. Média por tópico,
// total de respostas e comentários (sem autor). Nunca expõe quem respondeu.

export type UcSurveyAggregate = {
  classUnitId: string;
  uc: string;
  turma: string;
  respostas: number;
  medias: Record<SurveyTopic, number | null>;
  comentarios: string[];
};

/** Média simples de uma lista de números (null se vazia), 1 casa. */
function media(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

const TOPIC_COLUMN: Record<SurveyTopic, "rating_infra" | "rating_didatica" | "rating_ritmo" | "rating_geral"> = {
  infra: "rating_infra",
  didatica: "rating_didatica",
  ritmo: "rating_ritmo",
  geral: "rating_geral",
};

/** Todas as UCs com pelo menos uma resposta, agregadas. Mais respostas primeiro. */
export async function getUcSurveyAggregates(): Promise<UcSurveyAggregate[]> {
  const admin = createAdminClient();

  const { data: respostas } = await admin
    .from("uc_survey_responses")
    .select("class_unit_id, rating_infra, rating_didatica, rating_ritmo, rating_geral, comment");
  if (!respostas || respostas.length === 0) return [];

  // Nomes de UC + turma.
  const cuIds = [...new Set(respostas.map((r) => r.class_unit_id))];
  const { data: cus } = await admin
    .from("class_units")
    .select("id, class:classes!class_id(name), uc:curricular_units!uc_id(title)")
    .in("id", cuIds);
  const info = new Map(
    (cus ?? []).map((c) => [
      c.id,
      {
        turma: (c.class as unknown as { name: string } | null)?.name ?? "Turma",
        uc: (c.uc as unknown as { title: string } | null)?.title ?? "UC",
      },
    ]),
  );

  // Agrupa por UC.
  const porUc = new Map<string, typeof respostas>();
  for (const r of respostas) {
    const arr = porUc.get(r.class_unit_id) ?? [];
    arr.push(r);
    porUc.set(r.class_unit_id, arr);
  }

  const result: UcSurveyAggregate[] = [];
  for (const [cuId, rs] of porUc) {
    const medias = {} as Record<SurveyTopic, number | null>;
    for (const t of SURVEY_TOPICS) {
      const col = TOPIC_COLUMN[t.id];
      const vals = rs.map((r) => r[col]).filter((v): v is number => v != null);
      medias[t.id] = media(vals);
    }
    const comentarios = rs
      .map((r) => (r.comment ?? "").trim())
      .filter((c) => c.length > 0);
    const meta = info.get(cuId) ?? { turma: "Turma", uc: "UC" };
    result.push({
      classUnitId: cuId,
      uc: meta.uc,
      turma: meta.turma,
      respostas: rs.length,
      medias,
      comentarios,
    });
  }

  return result.sort((a, b) => b.respostas - a.respostas);
}

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getMediasFeedback } from "@/lib/feedback/actions";

// Acompanhamento por PROFESSOR: está preenchendo frequência, tem plano de aula,
// quanto do plano executou (aulas lançadas vs planejadas), quantas atividades
// criou e a satisfação (feedback anônimo). Inclui turmas em co-docência.

export type TeacherRow = {
  id: string;
  nome: string;
  suspenso: boolean;
  turmas: number;
  classUnits: number;
  comPlano: number; // class_units com teaching_plan_id + blocos
  aulasPlanejadas: number; // soma do maior aula_fim por plano
  aulasDadas: number; // sessions com date <= hoje
  execucaoPct: number | null; // aulasDadas / aulasPlanejadas
  ucsComFrequencia: number; // class_units que têm ao menos 1 mark de presença
  atividades: number; // assignments criados nas turmas do professor
  feedbackAvg: number | null; // média do feedback anônimo (1–5)
  feedbackTotal: number; // nº de avaliações recebidas
};

export async function getTeachersReport(): Promise<TeacherRow[]> {
  const admin = createAdminClient();
  const hoje = new Date().toISOString().slice(0, 10);

  const { data: profs } = await admin
    .from("profiles")
    .select("id, display_name, disabled_at")
    .eq("role", "professor")
    .order("display_name");

  const medias = await getMediasFeedback((profs ?? []).map((p) => p.id));
  const rows: TeacherRow[] = [];

  for (const p of profs ?? []) {
    // Turmas do professor: próprias (dono) + em co-docência.
    const [{ data: ownTurmas }, { data: coTurmas }] = await Promise.all([
      admin.from("classes").select("id").eq("owner_id", p.id),
      admin.from("class_teachers").select("class_id").eq("teacher_id", p.id),
    ]);
    const classIds = [
      ...new Set([
        ...(ownTurmas ?? []).map((t) => t.id),
        ...(coTurmas ?? []).map((t) => t.class_id),
      ]),
    ];

    if (classIds.length === 0) {
      rows.push({
        id: p.id,
        nome: p.display_name,
        suspenso: !!p.disabled_at,
        turmas: 0,
        classUnits: 0,
        comPlano: 0,
        aulasPlanejadas: 0,
        aulasDadas: 0,
        execucaoPct: null,
        ucsComFrequencia: 0,
        atividades: 0,
        feedbackAvg: medias.get(p.id)?.avg ?? null,
        feedbackTotal: medias.get(p.id)?.total ?? 0,
      });
      continue;
    }

    // class_units das turmas (com plano vinculado).
    const { data: cus } = await admin
      .from("class_units")
      .select("id, teaching_plan_id")
      .in("class_id", classIds);
    const cuIds = (cus ?? []).map((c) => c.id);
    const planIds = (cus ?? [])
      .map((c) => c.teaching_plan_id)
      .filter((x): x is string => !!x);

    // Planos com blocos → aulas planejadas (maior aula_fim por plano).
    let aulasPlanejadas = 0;
    let comPlano = 0;
    if (planIds.length) {
      const { data: blocos } = await admin
        .from("teaching_plan_blocks")
        .select("plan_id, aula_fim")
        .in("plan_id", planIds);
      const maxPorPlano = new Map<string, number>();
      for (const b of blocos ?? []) {
        if (b.aula_fim == null) continue;
        maxPorPlano.set(b.plan_id, Math.max(maxPorPlano.get(b.plan_id) ?? 0, b.aula_fim));
      }
      for (const v of maxPorPlano.values()) aulasPlanejadas += v;
      // "com plano" = class_units cujo plano tem blocos.
      comPlano = (cus ?? []).filter(
        (c) => c.teaching_plan_id && maxPorPlano.has(c.teaching_plan_id),
      ).length;
    }

    // Aulas dadas (sessions já com data no passado/hoje) + UCs com frequência.
    let aulasDadas = 0;
    const ucsComFreqSet = new Set<string>();
    if (cuIds.length) {
      const { data: sessions } = await admin
        .from("attendance_sessions")
        .select("id, class_unit_id, date")
        .in("class_unit_id", cuIds);
      const sessionIds = (sessions ?? []).map((s) => s.id);
      for (const s of sessions ?? []) {
        if (s.date && s.date <= hoje) aulasDadas++;
      }
      // UCs com ao menos uma marca de presença.
      if (sessionIds.length) {
        const { data: marks } = await admin
          .from("attendance_marks")
          .select("session_id")
          .in("session_id", sessionIds);
        const sessToCu = new Map(
          (sessions ?? []).map((s) => [s.id, s.class_unit_id as string]),
        );
        for (const m of marks ?? []) {
          const cuId = sessToCu.get(m.session_id);
          if (cuId) ucsComFreqSet.add(cuId);
        }
      }
    }

    // Atividades criadas nas turmas.
    const { count: atividades } = await admin
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .in("class_id", classIds);

    rows.push({
      id: p.id,
      nome: p.display_name,
      suspenso: !!p.disabled_at,
      turmas: classIds.length,
      classUnits: cuIds.length,
      comPlano,
      aulasPlanejadas,
      aulasDadas,
      execucaoPct:
        aulasPlanejadas > 0 ? Math.round((aulasDadas / aulasPlanejadas) * 100) : null,
      ucsComFrequencia: ucsComFreqSet.size,
      atividades: atividades ?? 0,
      feedbackAvg: medias.get(p.id)?.avg ?? null,
      feedbackTotal: medias.get(p.id)?.total ?? 0,
    });
  }

  return rows;
}

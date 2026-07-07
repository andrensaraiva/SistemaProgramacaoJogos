import "server-only";

import { getStudentsReport } from "@/lib/reports/students";
import { getTeachersReport, type TeacherRow } from "@/lib/reports/teachers";
import { computeOccupancy, type OccupancyDay } from "@/lib/rooms/occupancy";
import { createAdminClient } from "@/lib/supabase/admin";

// =============================================================================
// Dados do painel do COORDENADOR — supervisão institucional.
// =============================================================================
// Agrega: métricas gerais, professores a acompanhar (frequência/plano/execução),
// alunos em risco e a corrigir (institucional). Tudo por service-role.

export type TurmaResumo = {
  id: string;
  nome: string;
  alunos: number;
  emRisco: number;
  dono: string | null;
};

export type ProfessorAcompanhar = {
  id: string;
  nome: string;
  turmas: number;
  semPlano: number; // class_units sem plano
  execucaoPct: number | null;
  semFrequencia: boolean; // nenhuma UC com frequência lançada
};

export type AlunoRiscoResumo = {
  aluno: string;
  turma: string;
  uc: string;
  situacao: string;
  media: number | null;
  freqPct: number | null;
};

export type ChecklistProfessor = {
  id: string;
  nome: string;
  presencaFeita: boolean;
  planoRegistrado: boolean;
};

export type UsoSalas = {
  totalConflitos: number;
  /** Aulas (dias de calendário) sem sala definida, nos próximos 30 dias. */
  aulasSemSala: number;
};

export type CoordinatorDashboard = {
  turmasCount: number;
  alunosCount: number;
  emRiscoCount: number;
  aCorrigirCount: number;
  turmas: TurmaResumo[];
  professores: ProfessorAcompanhar[];
  emRisco: AlunoRiscoResumo[];
  checklistHoje: ChecklistProfessor[];
  usoSalas: UsoSalas;
};

export async function getCoordinatorDashboard(): Promise<CoordinatorDashboard> {
  const admin = createAdminClient();

  const [turmasRes, membrosRes, correcoesRes, emRiscoTudo, teachers] = await Promise.all([
    admin.from("classes").select("id, name, owner_id, owner:profiles!owner_id(display_name)").order("name"),
    admin.from("class_members").select("class_id, student_id"),
    admin.from("submissions").select("id, assignment:assignments!assignment_id(class_id)").eq("status", "entregue"),
    getStudentsReport({ situacao: "em_risco" }),
    getTeachersReport(),
  ]);

  const turmasRaw = turmasRes.data ?? [];

  // Alunos por turma + total distinto.
  const alunosPorTurma = new Map<string, number>();
  const alunosDistintos = new Set<string>();
  for (const m of membrosRes.data ?? []) {
    alunosPorTurma.set(m.class_id, (alunosPorTurma.get(m.class_id) ?? 0) + 1);
    alunosDistintos.add(m.student_id);
  }

  // Em risco por CLASS_ID (corrige o bug de indexar por nome). O relatório traz
  // o nome da turma; mapeamos nome→id (com aviso de colisão tratado por id único).
  const nomeParaId = new Map<string, string>();
  for (const t of turmasRaw) nomeParaId.set(t.name, t.id);
  const emRiscoPorTurma = new Map<string, number>();
  for (const r of emRiscoTudo) {
    const id = nomeParaId.get(r.turma);
    if (id) emRiscoPorTurma.set(id, (emRiscoPorTurma.get(id) ?? 0) + 1);
  }

  // A corrigir (institucional).
  const aCorrigirCount = (correcoesRes.data ?? []).filter((s) => {
    const a = s.assignment as unknown as { class_id: string } | null;
    return !!a;
  }).length;

  const turmas: TurmaResumo[] = turmasRaw.map((t) => ({
    id: t.id,
    nome: t.name,
    alunos: alunosPorTurma.get(t.id) ?? 0,
    emRisco: emRiscoPorTurma.get(t.id) ?? 0,
    dono: (t.owner as unknown as { display_name: string } | null)?.display_name ?? null,
  }));

  // Professores a acompanhar: prioriza quem tem pendência (sem plano, execução
  // baixa, sem frequência). Mapeia do relatório de professores.
  const professores: ProfessorAcompanhar[] = (teachers as TeacherRow[])
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      turmas: p.turmas,
      semPlano: Math.max(0, p.classUnits - p.comPlano),
      execucaoPct: p.execucaoPct,
      semFrequencia: p.ucsComFrequencia === 0 && p.classUnits > 0,
    }))
    // só quem leciona (tem turmas), ordenado por "mais pendência"
    .filter((p) => p.turmas > 0)
    .sort((a, b) => {
      const score = (x: ProfessorAcompanhar) =>
        (x.semFrequencia ? 100 : 0) + x.semPlano * 10 + (100 - (x.execucaoPct ?? 100));
      return score(b) - score(a);
    });

  const emRisco: AlunoRiscoResumo[] = emRiscoTudo.slice(0, 10).map((r) => ({
    aluno: r.aluno,
    turma: r.turma,
    uc: r.uc,
    situacao: r.situacao,
    media: r.media,
    freqPct: r.freqPct,
  }));

  // Peças novas (helpers modulares, calculados em paralelo).
  const idsProfessores = professores.map((p) => p.id);
  const nomePorProfessor = new Map(professores.map((p) => [p.id, p.nome]));
  const [checklistHoje, usoSalas] = await Promise.all([
    calcularChecklistProfessores(admin, idsProfessores, nomePorProfessor),
    calcularUsoSalas(admin),
  ]);

  return {
    turmasCount: turmasRaw.length,
    alunosCount: alunosDistintos.size,
    emRiscoCount: emRiscoTudo.length,
    aCorrigirCount,
    turmas,
    professores,
    emRisco,
    checklistHoje,
    usoSalas,
  };
}

/** YYYY-MM-DD de hoje no fuso local do servidor. */
function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Estado do checklist diário HOJE por professor: "feito" = TODAS as turmas do
 *  dia marcadas (o checklist agora é por turma). Sem linhas = ainda não marcou. */
async function calcularChecklistProfessores(
  admin: ReturnType<typeof createAdminClient>,
  professorIds: string[],
  nomePorId: Map<string, string>,
): Promise<ChecklistProfessor[]> {
  if (professorIds.length === 0) return [];
  const { data } = await admin
    .from("teacher_daily_checklist")
    .select("teacher_id, presenca_feita, plano_registrado")
    .eq("check_date", hojeISO())
    .in("teacher_id", professorIds);

  // Agrega por professor: presença/plano só contam como "feito" se TODAS as
  // linhas (turmas) do dia estão marcadas. Sem linha = false.
  const agg = new Map<string, { presenca: boolean; plano: boolean; temLinha: boolean }>();
  for (const c of data ?? []) {
    const a = agg.get(c.teacher_id) ?? { presenca: true, plano: true, temLinha: false };
    a.presenca = a.presenca && c.presenca_feita;
    a.plano = a.plano && c.plano_registrado;
    a.temLinha = true;
    agg.set(c.teacher_id, a);
  }
  return professorIds.map((id) => {
    const a = agg.get(id);
    return {
      id,
      nome: nomePorId.get(id) ?? "Professor",
      presencaFeita: a?.temLinha ? a.presenca : false,
      planoRegistrado: a?.temLinha ? a.plano : false,
    };
  });
}

/** Uso de salas: conflitos (reusa computeOccupancy) + aulas sem sala (30 dias). */
async function calcularUsoSalas(
  admin: ReturnType<typeof createAdminClient>,
): Promise<UsoSalas> {
  const hoje = hojeISO();
  const em30 = new Date(Date.now() + 30 * 86_400_000);
  const ate = `${em30.getFullYear()}-${String(em30.getMonth() + 1).padStart(2, "0")}-${String(em30.getDate()).padStart(2, "0")}`;

  const { data } = await admin
    .from("calendar_days")
    .select("date, room_id, marker, calendar:course_calendars!calendar_id(class_id, class:classes!class_id(name))")
    .gte("date", hoje)
    .lte("date", ate);

  const dias: OccupancyDay[] = [];
  let aulasSemSala = 0;
  for (const d of data ?? []) {
    // Só dias letivos (sem marker de feriado/recesso/etc.).
    if (d.marker) continue;
    const cal = d.calendar as unknown as { class_id: string; class: { name: string } | null } | null;
    if (!cal) continue;
    if (!d.room_id) {
      aulasSemSala += 1;
      continue;
    }
    dias.push({
      date: d.date as string,
      roomId: d.room_id as string,
      classId: cal.class_id,
      turma: cal.class?.name ?? "Turma",
    });
  }
  const occ = computeOccupancy(dias);
  return { totalConflitos: occ.totalConflitos, aulasSemSala };
}

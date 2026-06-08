import "server-only";

import { progressoNivel, type ProgressoNivel } from "@/lib/gamification/level";
import { getStudentsReport } from "@/lib/reports/students";
import { createAdminClient } from "@/lib/supabase/admin";

// =============================================================================
// Dados do painel do ALUNO — experiência gamificada + acompanhamento próprio.
// =============================================================================
// Agrega SÓ o que é do próprio aluno logado: progresso de nível, pendências
// (atividades sem entrega), desempenho por UC (média/freq/situação) e turmas.

export type DesempenhoUc = {
  classId: string;
  turma: string;
  uc: string;
  media: number | null;
  freqPct: number | null;
  situacao: string;
  freqBaixa: boolean;
};

export type Pendencia = {
  classId: string;
  turma: string;
  assignmentId: string;
  titulo: string;
  dueAt: string | null;
};

export type UcAtalho = { classUnitId: string; classId: string; turma: string; uc: string };

export type StudentDashboard = {
  nivel: ProgressoNivel;
  conquistas: number;
  turmas: { id: string; name: string }[];
  ucs: UcAtalho[];
  resumo: { aprovado: number; recuperacao: number; reprovado: number; freqMedia: number | null };
  desempenho: DesempenhoUc[];
  pendencias: Pendencia[];
};

export async function getStudentDashboard(profile: {
  id: string;
  xp: number;
}): Promise<StudentDashboard> {
  const admin = createAdminClient();

  // Turmas do aluno + nomes.
  const { data: membros } = await admin
    .from("class_members")
    .select("class_id, class:classes!class_id(id, name)")
    .eq("student_id", profile.id);
  const turmas = (membros ?? [])
    .map((m) => m.class as unknown as { id: string; name: string } | null)
    .filter((c): c is { id: string; name: string } => !!c);
  const turmaNome = new Map(turmas.map((t) => [t.id, t.name]));
  const turmaIds = turmas.map((t) => t.id);

  const [conquistasRes, desempenhoTudo, pendencias, ucsRes] = await Promise.all([
    admin.from("user_badges").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
    // Relatório institucional → filtra só as linhas DESTE aluno.
    getStudentsReport(),
    carregarPendencias(admin, profile.id, turmaIds, turmaNome),
    turmaIds.length
      ? admin
          .from("class_units")
          .select("id, class_id, uc:curricular_units!uc_id(title)")
          .in("class_id", turmaIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const ucs: UcAtalho[] = (ucsRes.data ?? []).map((raw) => {
    const c = raw as Record<string, unknown>;
    return {
      classUnitId: c.id as string,
      classId: c.class_id as string,
      turma: turmaNome.get(c.class_id as string) ?? "Turma",
      uc: (c.uc as unknown as { title: string } | null)?.title ?? "UC",
    };
  });

  const desempenho: DesempenhoUc[] = desempenhoTudo
    .filter((r) => r.alunoId === profile.id)
    .map((r) => ({
      classId: turmaIds.find((id) => turmaNome.get(id) === r.turma) ?? "",
      turma: r.turma,
      uc: r.uc,
      media: r.media,
      freqPct: r.freqPct,
      situacao: r.situacao,
      freqBaixa: r.freqBaixa,
    }));

  // Resumo das situações.
  const resumo = { aprovado: 0, recuperacao: 0, reprovado: 0, freqMedia: null as number | null };
  let somaFreq = 0;
  let nFreq = 0;
  for (const d of desempenho) {
    if (d.situacao === "aprovado") resumo.aprovado += 1;
    else if (d.situacao === "recuperacao") resumo.recuperacao += 1;
    else if (d.situacao === "reprovado") resumo.reprovado += 1;
    if (d.freqPct != null) {
      somaFreq += d.freqPct;
      nFreq += 1;
    }
  }
  resumo.freqMedia = nFreq > 0 ? Math.round(somaFreq / nFreq) : null;

  return {
    nivel: progressoNivel(profile.xp),
    conquistas: conquistasRes.count ?? 0,
    turmas,
    ucs,
    resumo,
    desempenho,
    pendencias,
  };
}

/** Atividades com prazo nas turmas do aluno que ele ainda NÃO entregou. */
async function carregarPendencias(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  turmaIds: string[],
  turmaNome: Map<string, string>,
): Promise<Pendencia[]> {
  if (turmaIds.length === 0) return [];

  const hoje = new Date().toISOString();
  const { data: assignments } = await admin
    .from("assignments")
    .select("id, title, class_id, due_at")
    .in("class_id", turmaIds)
    .not("due_at", "is", null)
    .gte("due_at", hoje)
    .order("due_at", { ascending: true });

  const ids = (assignments ?? []).map((a) => a.id);
  if (ids.length === 0) return [];

  // Quais já têm entrega do aluno (qualquer status conta como "mexeu").
  const { data: subs } = await admin
    .from("submissions")
    .select("assignment_id")
    .eq("student_id", studentId)
    .in("assignment_id", ids);
  const entregues = new Set((subs ?? []).map((s) => s.assignment_id));

  return (assignments ?? [])
    .filter((a) => !entregues.has(a.id))
    .map((a) => ({
      classId: a.class_id,
      turma: turmaNome.get(a.class_id) ?? "Turma",
      assignmentId: a.id,
      titulo: a.title,
      dueAt: a.due_at,
    }));
}

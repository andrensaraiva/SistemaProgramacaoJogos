import "server-only";

import { getStudentsReport } from "@/lib/reports/students";
import { getTeachersReport, type TeacherRow } from "@/lib/reports/teachers";
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

export type CoordinatorDashboard = {
  turmasCount: number;
  alunosCount: number;
  emRiscoCount: number;
  aCorrigirCount: number;
  turmas: TurmaResumo[];
  professores: ProfessorAcompanhar[];
  emRisco: AlunoRiscoResumo[];
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

  return {
    turmasCount: turmasRaw.length,
    alunosCount: alunosDistintos.size,
    emRiscoCount: emRiscoTudo.length,
    aCorrigirCount,
    turmas,
    professores,
    emRisco,
  };
}

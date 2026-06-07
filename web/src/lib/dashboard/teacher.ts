import "server-only";

import { getStudentsReport } from "@/lib/reports/students";
import { createAdminClient } from "@/lib/supabase/admin";

// =============================================================================
// Dados do painel do PROFESSOR — específico do papel (não é o painel de aluno).
// =============================================================================
// Agrega o que o professor precisa na primeira tela: turmas, alunos, entregas a
// corrigir, aula(s) de hoje (calendário) e alunos em risco. Leitura por
// service-role, sempre restrita às turmas que o professor gerencia.

export type CorrecaoPendente = {
  submissionId: string;
  turmaId: string;
  turma: string;
  listaId: string;
  lista: string;
  exercicio: string;
  aluno: string;
  enviadaEm: string;
  href: string; // link direto para corrigir
};

export type AulaHoje = {
  turmaId: string;
  turma: string;
  uc: string | null;
  sala: string | null;
};

export type AlunoRiscoResumo = {
  aluno: string;
  turma: string;
  uc: string;
  situacao: string;
  media: number | null;
  freqPct: number | null;
};

export type TeacherDashboard = {
  turmasCount: number;
  alunosCount: number;
  aCorrigirCount: number;
  emRiscoCount: number;
  aCorrigir: CorrecaoPendente[];
  aulasHoje: AulaHoje[];
  emRisco: AlunoRiscoResumo[];
};

/** YYYY-MM-DD de hoje no fuso local do servidor (datas do calendário são sem fuso). */
function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** IDs das turmas que o professor gerencia: dono + co-docência. */
async function turmasDoProfessor(
  admin: ReturnType<typeof createAdminClient>,
  professorId: string,
): Promise<{ id: string; name: string }[]> {
  const [{ data: donas }, { data: co }] = await Promise.all([
    admin.from("classes").select("id, name").eq("owner_id", professorId),
    admin
      .from("class_teachers")
      .select("class:classes!class_id(id, name)")
      .eq("teacher_id", professorId),
  ]);
  const map = new Map<string, string>();
  for (const c of donas ?? []) map.set(c.id, c.name);
  for (const r of co ?? []) {
    const c = r.class as unknown as { id: string; name: string } | null;
    if (c) map.set(c.id, c.name);
  }
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

export async function getTeacherDashboard(professorId: string): Promise<TeacherDashboard> {
  const admin = createAdminClient();
  const turmas = await turmasDoProfessor(admin, professorId);
  const turmaIds = turmas.map((t) => t.id);
  const turmaNome = new Map(turmas.map((t) => [t.id, t.name]));

  if (turmaIds.length === 0) {
    return {
      turmasCount: 0,
      alunosCount: 0,
      aCorrigirCount: 0,
      emRiscoCount: 0,
      aCorrigir: [],
      aulasHoje: [],
      emRisco: [],
    };
  }

  const hoje = hojeISO();

  const [alunosRes, correcoesRes, aulasRes, emRiscoTudo] = await Promise.all([
    // Total de alunos (matrículas distintas nas turmas do professor).
    admin.from("class_members").select("student_id").in("class_id", turmaIds),
    // Entregas aguardando correção manual (status 'entregue').
    admin
      .from("submissions")
      .select(
        "id, created_at, student:profiles!student_id(display_name), exercise:exercises!exercise_id(title), assignment:assignments!assignment_id(id, title, class_id)",
      )
      .eq("status", "entregue")
      .order("created_at", { ascending: true })
      .limit(50),
    // Aula(s) de hoje: dias do calendário com data = hoje nas turmas do professor.
    admin
      .from("calendar_days")
      .select(
        "date, class_unit:class_units!class_unit_id(class_id, uc:curricular_units!uc_id(title)), room:rooms!room_id(name), calendar:course_calendars!calendar_id(class_id)",
      )
      .eq("date", hoje),
    // Alunos em risco — reusa o relatório (todas as turmas; filtramos abaixo).
    getStudentsReport({ situacao: "em_risco" }),
  ]);

  // Alunos distintos.
  const alunosSet = new Set((alunosRes.data ?? []).map((m) => m.student_id));

  // A corrigir: filtra só as turmas do professor e monta o link de correção.
  const aCorrigir: CorrecaoPendente[] = [];
  for (const s of correcoesRes.data ?? []) {
    const a = s.assignment as unknown as { id: string; title: string; class_id: string } | null;
    if (!a || !turmaIds.includes(a.class_id)) continue;
    const aluno = (s.student as unknown as { display_name: string } | null)?.display_name ?? "Aluno";
    const exercicio = (s.exercise as unknown as { title: string } | null)?.title ?? "Exercício";
    aCorrigir.push({
      submissionId: s.id,
      turmaId: a.class_id,
      turma: turmaNome.get(a.class_id) ?? "Turma",
      listaId: a.id,
      lista: a.title,
      exercicio,
      aluno,
      enviadaEm: s.created_at,
      href: `/turmas/${a.class_id}/listas/${a.id}/corrigir/${s.id}`,
    });
  }

  // Aula(s) de hoje nas turmas do professor.
  const aulasHoje: AulaHoje[] = [];
  for (const d of aulasRes.data ?? []) {
    const cal = d.calendar as unknown as { class_id: string } | null;
    const cu = d.class_unit as unknown as { class_id: string; uc: { title: string } | null } | null;
    const classId = cal?.class_id ?? cu?.class_id ?? null;
    if (!classId || !turmaIds.includes(classId)) continue;
    const sala = (d.room as unknown as { name: string } | null)?.name ?? null;
    aulasHoje.push({
      turmaId: classId,
      turma: turmaNome.get(classId) ?? "Turma",
      uc: cu?.uc?.title ?? null,
      sala,
    });
  }

  // Em risco: limita às turmas do professor (o relatório usa nome da turma).
  const nomesTurmas = new Set(turmas.map((t) => t.name));
  const emRisco: AlunoRiscoResumo[] = emRiscoTudo
    .filter((r) => nomesTurmas.has(r.turma))
    .slice(0, 8)
    .map((r) => ({
      aluno: r.aluno,
      turma: r.turma,
      uc: r.uc,
      situacao: r.situacao,
      media: r.media,
      freqPct: r.freqPct,
    }));
  const emRiscoCount = emRiscoTudo.filter((r) => nomesTurmas.has(r.turma)).length;

  return {
    turmasCount: turmas.length,
    alunosCount: alunosSet.size,
    aCorrigirCount: aCorrigir.length,
    emRiscoCount,
    aCorrigir: aCorrigir.slice(0, 10),
    aulasHoje,
    emRisco,
  };
}

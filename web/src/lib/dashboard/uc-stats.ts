import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Agrega os indicadores de uma UC numa turma: frequência (presenças/atrasos/
// faltas), notas (média e por aluno) e entregas. Usado pelo dashboard e pelo
// relatório imprimível. O caller deve ter verificado a posse da turma.

export type AlunoStat = {
  id: string;
  name: string;
  presencas: number;
  atrasos: number;
  faltas: number;
  presencaPct: number | null;
  mediaNota: number | null;
  entregues: number;
};

export type UcStats = {
  classUnit: { id: string; serie: string | null };
  uc: { title: string; carga_horaria_h: number | null } | null;
  turma: { id: string; name: string };
  totalAlunos: number;
  totalAulas: number;
  freq: { presencas: number; atrasos: number; faltas: number };
  freqMediaPct: number | null;
  mediaGeral: number | null;
  alunos: AlunoStat[];
};

export async function getUcStats(classUnitId: string): Promise<UcStats | null> {
  const admin = createAdminClient();

  const { data: cu } = await admin
    .from("class_units")
    .select("id, serie, class:classes!class_id(id, name), uc:curricular_units!uc_id(title, carga_horaria_h)")
    .eq("id", classUnitId)
    .single();
  if (!cu) return null;

  const turma = cu.class as unknown as { id: string; name: string };
  const uc = cu.uc as unknown as { title: string; carga_horaria_h: number | null } | null;

  // Alunos da turma.
  const { data: membros } = await admin
    .from("class_members")
    .select("student:profiles!student_id(id, display_name)")
    .eq("class_id", turma.id)
    .order("joined_at");
  const alunos = (membros ?? []).map((m) => {
    const s = m.student as unknown as { id: string; display_name: string };
    return { id: s.id, name: s.display_name };
  });

  // Aulas (sessions) da UC e marcas.
  const { data: sessions } = await admin
    .from("attendance_sessions")
    .select("id")
    .eq("class_unit_id", classUnitId);
  const sessionIds = (sessions ?? []).map((s) => s.id);

  const { data: marks } = sessionIds.length
    ? await admin
        .from("attendance_marks")
        .select("student_id, status")
        .in("session_id", sessionIds)
    : { data: [] as { student_id: string; status: string }[] };

  // Notas/entregas: submissões dos alunos nas listas da turma.
  const { data: listas } = await admin
    .from("assignments")
    .select("id")
    .eq("class_id", turma.id);
  const assignmentIds = (listas ?? []).map((l) => l.id);

  const { data: subs } = assignmentIds.length
    ? await admin
        .from("submissions")
        .select("student_id, status, manual_grade")
        .in("assignment_id", assignmentIds)
    : { data: [] as { student_id: string; status: string; manual_grade: number | null }[] };

  // Monta por aluno.
  const byStudent = new Map<string, AlunoStat>();
  for (const a of alunos) {
    byStudent.set(a.id, {
      id: a.id,
      name: a.name,
      presencas: 0,
      atrasos: 0,
      faltas: 0,
      presencaPct: null,
      mediaNota: null,
      entregues: 0,
    });
  }

  for (const m of marks ?? []) {
    const st = byStudent.get(m.student_id);
    if (!st) continue;
    if (m.status === "presente") st.presencas++;
    else if (m.status === "atraso") st.atrasos++;
    else if (m.status === "falta") st.faltas++;
  }

  const notasPorAluno = new Map<string, number[]>();
  for (const s of subs ?? []) {
    const st = byStudent.get(s.student_id);
    if (!st) continue;
    if (s.status === "aprovado" || s.status === "entregue" || s.manual_grade != null) {
      st.entregues++;
    }
    if (s.manual_grade != null) {
      const arr = notasPorAluno.get(s.student_id) ?? [];
      arr.push(s.manual_grade);
      notasPorAluno.set(s.student_id, arr);
    }
  }

  // Percentuais e médias por aluno.
  let somaPct = 0;
  let comFreq = 0;
  const todasNotas: number[] = [];
  for (const st of byStudent.values()) {
    const reg = st.presencas + st.atrasos + st.faltas;
    if (reg > 0) {
      st.presencaPct = Math.round(((st.presencas + st.atrasos * 0.5) / reg) * 100);
      somaPct += st.presencaPct;
      comFreq++;
    }
    const notas = notasPorAluno.get(st.id) ?? [];
    if (notas.length) {
      st.mediaNota = Number((notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1));
      todasNotas.push(...notas);
    }
  }

  const freq = { presencas: 0, atrasos: 0, faltas: 0 };
  for (const st of byStudent.values()) {
    freq.presencas += st.presencas;
    freq.atrasos += st.atrasos;
    freq.faltas += st.faltas;
  }

  return {
    classUnit: { id: cu.id, serie: cu.serie },
    uc,
    turma,
    totalAlunos: alunos.length,
    totalAulas: sessionIds.length,
    freq,
    freqMediaPct: comFreq > 0 ? Math.round(somaPct / comFreq) : null,
    mediaGeral:
      todasNotas.length > 0
        ? Number((todasNotas.reduce((a, b) => a + b, 0) / todasNotas.length).toFixed(1))
        : null,
    alunos: [...byStudent.values()],
  };
}

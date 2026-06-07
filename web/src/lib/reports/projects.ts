import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Relatório de desempenho dos Projetos Integradores. Sem nota de projeto no
// schema — desempenho = progresso no board (tarefas concluídas / total) por
// GRUPO dentro de cada projeto. Ver [[projeto-integrador]].

export type ProjectGroupRow = {
  projectId: string;
  projeto: string;
  turma: string;
  uc: string;
  grupo: string;
  totalTasks: number;
  concluidas: number;
  fazendo: number;
  aFazer: number;
  pct: number | null; // % concluído
  parado: boolean; // sem tarefas OU 0 concluídas
};

export type ProjectsReport = {
  totals: {
    projetos: number;
    grupos: number;
    gruposParados: number;
    pctMedio: number | null;
  };
  groups: ProjectGroupRow[];
};

export async function getProjectsReport(): Promise<ProjectsReport> {
  const admin = createAdminClient();

  // Projetos com turma/UC.
  const { data: projects } = await admin
    .from("projects")
    .select(
      "id, title, class_unit:class_units!class_unit_id(class:classes!class_id(name), uc:curricular_units!uc_id(title))",
    );

  const projectList = (projects ?? []).map((p) => {
    const cu = p.class_unit as unknown as {
      class: { name: string } | null;
      uc: { title: string } | null;
    } | null;
    return {
      id: p.id as string,
      titulo: (p.title as string) ?? "Projeto",
      turma: cu?.class?.name ?? "—",
      uc: cu?.uc?.title ?? "UC",
    };
  });
  const projectIds = projectList.map((p) => p.id);

  // Tarefas de todos os projetos (1 query) + nomes dos grupos.
  const { data: tasks } = projectIds.length
    ? await admin
        .from("project_tasks")
        .select("project_id, group_id, status")
        .in("project_id", projectIds)
    : { data: [] as { project_id: string; group_id: string; status: string }[] };

  const groupIds = [...new Set((tasks ?? []).map((t) => t.group_id))];
  const { data: grupos } = groupIds.length
    ? await admin.from("class_groups").select("id, name").in("id", groupIds)
    : { data: [] as { id: string; name: string }[] };
  const groupName = new Map((grupos ?? []).map((g) => [g.id, g.name]));

  // Acumula por (projeto, grupo).
  type Acc = { concluidas: number; fazendo: number; aFazer: number; total: number };
  const acc = new Map<string, Acc>(); // key = projectId|groupId
  for (const t of tasks ?? []) {
    const key = `${t.project_id}|${t.group_id}`;
    const cur = acc.get(key) ?? { concluidas: 0, fazendo: 0, aFazer: 0, total: 0 };
    cur.total += 1;
    if (t.status === "concluido") cur.concluidas += 1;
    else if (t.status === "fazendo") cur.fazendo += 1;
    else cur.aFazer += 1;
    acc.set(key, cur);
  }

  const projById = new Map(projectList.map((p) => [p.id, p]));
  const groups: ProjectGroupRow[] = [];
  for (const [key, a] of acc) {
    const [projectId, groupId] = key.split("|");
    const proj = projById.get(projectId);
    if (!proj) continue;
    const pct = a.total > 0 ? Math.round((a.concluidas / a.total) * 100) : null;
    groups.push({
      projectId,
      projeto: proj.titulo,
      turma: proj.turma,
      uc: proj.uc,
      grupo: groupName.get(groupId) ?? "Grupo",
      totalTasks: a.total,
      concluidas: a.concluidas,
      fazendo: a.fazendo,
      aFazer: a.aFazer,
      pct,
      parado: a.total === 0 || a.concluidas === 0,
    });
  }

  groups.sort((x, y) => (x.pct ?? -1) - (y.pct ?? -1)); // menor progresso primeiro

  const comPct = groups.filter((g) => g.pct != null);
  const pctMedio =
    comPct.length > 0
      ? Math.round(comPct.reduce((s, g) => s + (g.pct ?? 0), 0) / comPct.length)
      : null;

  return {
    totals: {
      projetos: projectList.length,
      grupos: groups.length,
      gruposParados: groups.filter((g) => g.parado).length,
      pctMedio,
    },
    groups,
  };
}

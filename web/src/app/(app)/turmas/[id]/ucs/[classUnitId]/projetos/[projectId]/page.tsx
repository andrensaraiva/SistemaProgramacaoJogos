import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ConfirmForm } from "@/components/confirm-form";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/dal";
import { getAcessoTurma } from "@/lib/turmas/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { excluirSprint } from "@/lib/projects/actions";

import { ProjetoSetup } from "./_setup";
import { SprintForm } from "./_sprint-form";
import { GroupBoard } from "./_board";

// O [projectId] da rota é, na verdade, o assignment_id da atividade
// projeto_integrador. O projeto (projects) é 1:1 com a atividade e é criado pelo
// professor na primeira visita (ProjetoSetup).
type Params = Promise<{ id: string; classUnitId: string; projectId: string }>;

export default async function ProjetoPage({ params }: { params: Params }) {
  const { id, classUnitId, projectId: assignmentId } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const supabase = await createClient();

  // Atividade + UC + turma (posse).
  const { data: cu } = await supabase
    .from("class_units")
    .select(
      "id, class_id, class:classes!class_id(id, name, owner_id), uc:curricular_units!uc_id(id, title)",
    )
    .eq("id", classUnitId)
    .single();
  if (!cu || cu.class_id !== id) notFound();
  const cls = cu.class as unknown as { id: string; name: string; owner_id: string };
  const uc = cu.uc as unknown as { id: string; title: string } | null;
  const isOwner = (await getAcessoTurma(id, profile, cls.owner_id)).podeGerenciar;

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, kind, class_unit_id")
    .eq("id", assignmentId)
    .single();
  if (!assignment || assignment.class_unit_id !== classUnitId) notFound();

  const admin = createAdminClient();

  // Projeto já existe?
  const { data: project } = await admin
    .from("projects")
    .select("id, title, description")
    .eq("assignment_id", assignmentId)
    .maybeSingle();

  const crumbs = [
    { label: "Turmas", href: "/turmas" },
    { label: cls.name, href: `/turmas/${id}` },
    { label: "Unidades curriculares", href: `/turmas/${id}/ucs` },
    { label: uc?.title ?? "UC", href: `/turmas/${id}/ucs/${classUnitId}/atividades` },
    { label: assignment.title },
  ];

  // Projeto ainda não configurado: só o professor pode criar.
  if (!project) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={crumbs} />
        <div>
          <h1 className="text-2xl font-bold">{assignment.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Projeto integrador</p>
        </div>
        {isOwner ? (
          <ProjetoSetup
            classId={id}
            classUnitId={classUnitId}
            assignmentId={assignmentId}
            defaultTitle={assignment.title}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            O professor ainda não configurou este projeto.
          </div>
        )}
      </div>
    );
  }

  // Sprints do projeto.
  const { data: sprints } = await admin
    .from("project_sprints")
    .select("id, title, goal, starts_on, ends_on, ord")
    .eq("project_id", project.id)
    .order("ord");

  // Grupos da turma (boards) + membros (para responsável e visibilidade).
  const { data: groups } = await admin
    .from("class_groups")
    .select("id, name")
    .eq("class_id", id)
    .order("name");

  const { data: members } = await admin
    .from("class_group_members")
    .select("group_id, student:profiles!student_id(id, display_name)")
    .in("group_id", (groups ?? []).map((g) => g.id).length ? (groups ?? []).map((g) => g.id) : ["00000000-0000-0000-0000-000000000000"]);

  const membersByGroup = new Map<string, { id: string; display_name: string }[]>();
  for (const m of members ?? []) {
    const student = m.student as unknown as { id: string; display_name: string };
    const arr = membersByGroup.get(m.group_id) ?? [];
    arr.push(student);
    membersByGroup.set(m.group_id, arr);
  }

  // Quais grupos o aluno vê: dono vê todos; aluno vê só os seus.
  const myGroupIds = new Set(
    (members ?? [])
      .filter((m) => (m.student as unknown as { id: string }).id === profile.id)
      .map((m) => m.group_id),
  );
  const visibleGroups = (groups ?? []).filter(
    (g) => isOwner || myGroupIds.has(g.id),
  );

  // Cards de todos os grupos visíveis.
  type TaskRow = {
    id: string;
    group_id: string;
    sprint_id: string | null;
    title: string;
    description: string | null;
    status: string;
    assignee_id: string | null;
    ord: number;
  };
  const visibleIds = visibleGroups.map((g) => g.id);
  const tasks: TaskRow[] = visibleIds.length
    ? ((
        await admin
          .from("project_tasks")
          .select(
            "id, group_id, sprint_id, title, description, status, assignee_id, ord",
          )
          .eq("project_id", project.id)
          .in("group_id", visibleIds)
          .order("ord")
      ).data ?? [])
    : [];

  const tasksByGroup = new Map<string, TaskRow[]>();
  for (const t of tasks) {
    const arr = tasksByGroup.get(t.group_id) ?? [];
    arr.push(t);
    tasksByGroup.set(t.group_id, arr);
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={crumbs} />

      <div>
        <h1 className="text-2xl font-bold">{project.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {uc?.title ?? "UC"} · Projeto integrador
        </p>
        {project.description && (
          <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm text-foreground">
            {project.description}
          </p>
        )}
      </div>

      {/* Sprints */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Sprints</h2>
        {(sprints ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma sprint definida ainda.
          </p>
        )}
        <div className="grid gap-2 md:grid-cols-2">
          {(sprints ?? []).map((s) => (
            <div
              key={s.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div>
                <div className="font-medium">{s.title}</div>
                {s.goal && (
                  <div className="text-xs text-muted-foreground">{s.goal}</div>
                )}
                {(s.starts_on || s.ends_on) && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {s.starts_on ?? "?"} → {s.ends_on ?? "?"}
                  </div>
                )}
              </div>
              {isOwner && (
                <ConfirmForm action={excluirSprint} message="Excluir esta sprint?">
                  <input type="hidden" name="sprint_id" value={s.id} />
                  <input type="hidden" name="project_id" value={project.id} />
                  <Button type="submit" variant="ghost">
                    ✕
                  </Button>
                </ConfirmForm>
              )}
            </div>
          ))}
        </div>
        {isOwner && <SprintForm projectId={project.id} />}
      </section>

      {/* Boards por grupo */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">
          {isOwner ? "Boards dos grupos" : "Meu board"}
        </h2>
        {visibleGroups.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {isOwner
              ? "Crie grupos na turma para abrir os boards."
              : "Você ainda não está em um grupo desta turma."}
          </div>
        )}
        {visibleGroups.map((g) => (
          <GroupBoard
            key={g.id}
            projectId={project.id}
            group={g}
            tasks={(tasksByGroup.get(g.id) ?? []).map((t) => ({
              id: t.id,
              title: t.title,
              description: t.description,
              status: t.status,
              sprint_id: t.sprint_id,
              assignee_id: t.assignee_id,
              ord: t.ord,
            }))}
            sprints={(sprints ?? []).map((s) => ({ id: s.id, title: s.title }))}
            members={membersByGroup.get(g.id) ?? []}
          />
        ))}
      </section>
    </div>
  );
}

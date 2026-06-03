"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { criarCard, excluirCard, moverCard } from "@/lib/projects/actions";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  sprint_id: string | null;
  assignee_id: string | null;
};
type Member = { id: string; display_name: string };
type Sprint = { id: string; title: string };

const COLUMNS: { key: string; label: string }[] = [
  { key: "a_fazer", label: "A fazer" },
  { key: "fazendo", label: "Fazendo" },
  { key: "concluido", label: "Concluído" },
];

// Board estilo Trello (sem drag por ora): 3 colunas, mover card por botões.
export function GroupBoard({
  projectId,
  group,
  tasks,
  sprints,
  members,
}: {
  projectId: string;
  group: { id: string; name: string };
  tasks: Task[];
  sprints: Sprint[];
  members: Member[];
}) {
  const names = new Map(members.map((m) => [m.id, m.display_name]));

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{group.name}</h3>
        <span className="text-xs text-muted-foreground">
          {tasks.length} card{tasks.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const colTasks = tasks
            .filter((t) => t.status === col.key)
            .sort((a, b) => a.title.localeCompare(b.title));
          return (
            <div key={col.key} className="rounded-xl bg-muted/40 p-3">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground">
                <span>{col.label}</span>
                <span>{colTasks.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {colTasks.map((t) => (
                  <Card
                    key={t.id}
                    task={t}
                    assigneeName={t.assignee_id ? names.get(t.assignee_id) : null}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <AddCard
        projectId={projectId}
        groupId={group.id}
        sprints={sprints}
        members={members}
      />
    </div>
  );
}

function Card({
  task,
  assigneeName,
}: {
  task: Task;
  assigneeName: string | null | undefined;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-2.5 text-sm shadow-sm">
      <div className="font-medium">{task.title}</div>
      {task.description && (
        <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        {assigneeName ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {assigneeName}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">sem responsável</span>
        )}
        <div className="flex gap-1">
          {COLUMNS.filter((c) => c.key !== task.status).map((c) => (
            <form action={moverCard} key={c.key}>
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="status" value={c.key} />
              <button
                type="submit"
                title={`Mover para ${c.label}`}
                className="rounded border border-border px-1.5 py-0.5 text-[10px] hover:bg-muted"
              >
                {c.key === "a_fazer" ? "←" : c.key === "concluido" ? "✓" : "→"}
              </button>
            </form>
          ))}
          <form action={excluirCard}>
            <input type="hidden" name="task_id" value={task.id} />
            <button
              type="submit"
              title="Excluir card"
              className="rounded border border-border px-1.5 py-0.5 text-[10px] text-danger hover:bg-danger/10"
            >
              ✕
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function AddCard({
  projectId,
  groupId,
  sprints,
  members,
}: {
  projectId: string;
  groupId: string;
  sprints: Sprint[];
  members: Member[];
}) {
  const [open, setOpen] = useState(false);
  const bound = criarCard.bind(null, projectId, groupId);
  const [state, action, pending] = useActionState(bound, undefined);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground hover:bg-muted"
      >
        + Adicionar card
      </button>
    );
  }

  return (
    <form
      action={action}
      className="mt-3 flex flex-col gap-2 rounded-lg border border-border bg-background p-3"
    >
      <input
        name="title"
        placeholder="Título do card"
        required
        className="rounded-md border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <textarea
        name="description"
        rows={2}
        placeholder="Descrição (opcional)"
        className="rounded-md border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          name="sprint_id"
          defaultValue=""
          className="rounded-md border border-border bg-card px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Sem sprint</option>
          {sprints.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <select
          name="assignee_id"
          defaultValue=""
          className="rounded-md border border-border bg-card px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Sem responsável</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.display_name}
            </option>
          ))}
        </select>
      </div>

      {state && !state.ok && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-2 py-1 text-xs text-danger">
          {state.message}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Adicionando..." : "Adicionar"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

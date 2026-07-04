"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { avaliarGrupo, criarCard, excluirCard, moverCardDnd } from "@/lib/projects/actions";
import { createClient } from "@/lib/supabase/client";

type Grade = { grade: number | null; feedback: string | null };

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  sprint_id: string | null;
  assignee_id: string | null;
  ord: number;
};
type Member = { id: string; display_name: string };
type Sprint = { id: string; title: string };

const COLUMNS: { key: string; label: string }[] = [
  { key: "a_fazer", label: "A fazer" },
  { key: "fazendo", label: "Fazendo" },
  { key: "concluido", label: "Concluído" },
];

// Board estilo Trello com drag-and-drop (HTML5 nativo, sem libs) e tempo real
// (Supabase Realtime): mover um card numa aba reflete na aba dos colegas.
export function GroupBoard({
  projectId,
  group,
  isOwner,
  grade,
  tasks: initialTasks,
  sprints,
  members,
}: {
  projectId: string;
  group: { id: string; name: string };
  isOwner: boolean;
  grade: Grade | null;
  tasks: Task[];
  sprints: Sprint[];
  members: Member[];
}) {
  const router = useRouter();
  const names = new Map(members.map((m) => [m.id, m.display_name]));
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  // Sincroniza o estado local quando o servidor manda dados novos
  // (revalidatePath após uma action, navegação ou realtime). Padrão React de
  // "ajustar estado durante o render" guardando a última prop vista em state.
  const [seenServer, setSeenServer] = useState(initialTasks);
  if (seenServer !== initialTasks) {
    setSeenServer(initialTasks);
    setTasks(initialTasks);
  }

  // -------- Tempo real: atualiza o board quando um colega mexe nos cards. -----
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`board-${group.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_tasks",
          filter: `group_id=eq.${group.id}`,
        },
        () => {
          // Mudança veio de outra pessoa (ou outra aba): recarrega os dados do
          // servidor. Simples e consistente — o board é pequeno.
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [group.id, router]);

  function colTasks(status: string) {
    return tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.ord - b.ord);
  }

  async function handleDrop(status: string) {
    setOverCol(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const moved = tasks.find((t) => t.id === id);
    if (!moved || moved.status === status) return;

    // Otimista: move já na UI; o card vai pro fim da coluna de destino.
    const destIds = [...colTasks(status).map((t) => t.id), id];
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status, ord: destIds.length } : t)),
    );

    const res = await moverCardDnd(id, status, destIds);
    if (!res.ok) {
      // Falhou: reverte recarregando o servidor.
      router.refresh();
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">
          {group.name}
          {grade?.grade != null && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              Nota {grade.grade}
            </span>
          )}
        </h3>
        <span className="text-xs text-muted-foreground">
          {tasks.length} card{tasks.length !== 1 ? "s" : ""} · arraste para mover
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = colTasks(col.key);
          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                if (overCol !== col.key) setOverCol(col.key);
              }}
              onDragLeave={(e) => {
                // Só limpa se saiu de fato da coluna (não ao passar por um filho).
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setOverCol((c) => (c === col.key ? null : c));
                }
              }}
              onDrop={() => handleDrop(col.key)}
              className={`rounded-xl p-3 transition-colors ${
                overCol === col.key
                  ? "bg-primary/10 ring-2 ring-primary/40"
                  : "bg-muted/40"
              }`}
            >
              <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground">
                <span>{col.label}</span>
                <span>{list.length}</span>
              </div>
              <div className="flex min-h-[2.5rem] flex-col gap-2">
                {list.map((t) => (
                  <Card
                    key={t.id}
                    task={t}
                    assigneeName={t.assignee_id ? names.get(t.assignee_id) : null}
                    dragging={dragId === t.id}
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                  />
                ))}
                {list.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border/60 py-3 text-center text-[10px] text-muted-foreground">
                    solte aqui
                  </div>
                )}
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

      {/* Avaliação do projeto: professor dá nota; aluno vê nota + feedback */}
      {isOwner ? (
        <GradeForm projectId={projectId} groupId={group.id} grade={grade} />
      ) : (
        grade?.grade != null && (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold text-primary">
              🏆 Nota do projeto: {grade.grade}
            </div>
            {grade.feedback && (
              <p className="mt-1 whitespace-pre-wrap text-foreground">{grade.feedback}</p>
            )}
          </div>
        )
      )}
    </div>
  );
}

function GradeForm({
  projectId,
  groupId,
  grade,
}: {
  projectId: string;
  groupId: string;
  grade: Grade | null;
}) {
  const bound = avaliarGrupo.bind(null, projectId, groupId);
  const [state, action, pending] = useActionState(bound, undefined);

  return (
    <form action={action} className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-background/40 p-3">
      <div className="text-xs font-semibold uppercase text-muted-foreground">Avaliar projeto</div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Nota (0–10)</span>
          <input
            name="grade"
            type="number"
            min={0}
            max={10}
            step={0.1}
            defaultValue={grade?.grade ?? ""}
            placeholder="Ex: 8.5"
            className="w-24 rounded-md border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar nota"}
        </Button>
      </div>
      <textarea
        name="feedback"
        rows={2}
        defaultValue={grade?.feedback ?? ""}
        placeholder="Feedback para o grupo (opcional)"
        className="rounded-md border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      {state && !state.ok && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-2 py-1 text-xs text-danger">
          {state.message}
        </div>
      )}
      {state?.ok && (
        <div className="rounded-md border border-success/40 bg-success/10 px-2 py-1 text-xs text-success">
          Nota salva.
        </div>
      )}
    </form>
  );
}

function Card({
  task,
  assigneeName,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  assigneeName: string | null | undefined;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group cursor-grab rounded-lg border border-border bg-background p-2.5 text-sm shadow-sm transition-all active:cursor-grabbing ${
        dragging ? "opacity-40" : "hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-1.5">
        <span className="select-none pt-0.5 text-xs text-muted-foreground" aria-hidden>
          ⠿
        </span>
        <span className="font-medium">{task.title}</span>
      </div>
      {task.description && (
        <p className="mt-1 pl-5 text-xs text-muted-foreground">{task.description}</p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2 pl-5">
        {assigneeName ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {assigneeName}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">sem responsável</span>
        )}
        <form action={excluirCard}>
          <input type="hidden" name="task_id" value={task.id} />
          <button
            type="submit"
            title="Excluir card"
            className="rounded border border-border px-1.5 py-0.5 text-[10px] text-danger opacity-0 transition-opacity hover:bg-danger/10 group-hover:opacity-100"
          >
            ✕
          </button>
        </form>
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
  const wasPending = useRef(false);

  // Fecha o formulário quando a criação terminou com sucesso.
  useEffect(() => {
    if (wasPending.current && !pending && state?.ok) setOpen(false);
    wasPending.current = pending;
  }, [pending, state]);

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

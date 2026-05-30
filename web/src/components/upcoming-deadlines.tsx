import Link from "next/link";

// Widget "Próximas entregas" — inspirado no "Coming Up" do Canvas.
export type DeadlineItem = {
  assignmentId: string;
  classId: string;
  title: string;
  className: string;
  dueAt: string; // ISO
};

function formatRelative(dueAt: string): { text: string; tone: string } {
  const due = new Date(dueAt).getTime();
  const now = Date.now();
  const diffMs = due - now;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    return { text: "atrasada", tone: "text-danger" };
  }
  if (diffDays === 0) {
    return { text: "vence hoje", tone: "text-warning" };
  }
  if (diffDays === 1) {
    return { text: "vence amanhã", tone: "text-warning" };
  }
  if (diffDays <= 7) {
    return { text: `em ${diffDays} dias`, tone: "text-foreground" };
  }
  return { text: `em ${diffDays} dias`, tone: "text-muted-foreground" };
}

export function UpcomingDeadlines({ items }: { items: DeadlineItem[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">Próximas entregas</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhuma entrega com prazo definido por enquanto. 🎉
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item) => {
            const rel = formatRelative(item.dueAt);
            return (
              <li key={item.assignmentId}>
                <Link
                  href={`/turmas/${item.classId}/listas/${item.assignmentId}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 hover:border-primary/40"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {item.title}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {item.className} ·{" "}
                      {new Date(item.dueAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold ${rel.tone}`}>
                    {rel.text}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

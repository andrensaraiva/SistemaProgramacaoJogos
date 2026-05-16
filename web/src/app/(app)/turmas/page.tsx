import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export default async function TurmasPage() {
  const profile = await getProfile();
  const isProf =
    profile?.role === "professor" || profile?.role === "admin";

  const supabase = await createClient();

  if (isProf) {
    const { data: turmas } = await supabase
      .from("classes")
      .select(
        "id, name, description, invite_code, created_at, members:class_members(count), assignments:assignments(count)",
      )
      .eq("owner_id", profile!.id)
      .order("created_at", { ascending: false });

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Minhas turmas</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie suas turmas e listas de exercícios.
            </p>
          </div>
          <Link href="/turmas/nova">
            <Button>+ Nova turma</Button>
          </Link>
        </div>

        {!turmas?.length && (
          <EmptyState
            title="Nenhuma turma ainda"
            description='Clique em "Nova turma" para começar.'
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {turmas?.map((t) => {
            const memberCount = (t.members as unknown as { count: number }[])[0]
              ?.count ?? 0;
            const listCount = (
              t.assignments as unknown as { count: number }[]
            )[0]?.count ?? 0;
            return (
              <TurmaCard
                key={t.id}
                id={t.id}
                name={t.name}
                description={t.description ?? undefined}
                inviteCode={t.invite_code}
                memberCount={memberCount}
                listCount={listCount}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Aluno view
  const { data: turmas } = await supabase
    .from("class_members")
    .select(
      "joined_at, class:classes!class_id(id, name, description, owner:profiles!owner_id(display_name), assignments:assignments(count))",
    )
    .eq("student_id", profile!.id)
    .order("joined_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Minhas turmas</h1>
          <p className="text-sm text-muted-foreground">
            Turmas em que você está inscrito.
          </p>
        </div>
        <Link href="/turmas/entrar">
          <Button>Entrar com código</Button>
        </Link>
      </div>

      {!turmas?.length && (
        <EmptyState
          title="Nenhuma turma ainda"
          description='Peça o código de convite ao seu professor e clique em "Entrar com código".'
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {turmas?.map((m) => {
          const cls = m.class as unknown as {
            id: string;
            name: string;
            description: string | null;
            owner: { display_name: string };
            assignments: { count: number }[];
          };
          const listCount = cls.assignments[0]?.count ?? 0;
          return (
            <TurmaCard
              key={cls.id}
              id={cls.id}
              name={cls.name}
              description={cls.description ?? undefined}
              professorName={cls.owner.display_name}
              listCount={listCount}
            />
          );
        })}
      </div>
    </div>
  );
}

function TurmaCard({
  id,
  name,
  description,
  inviteCode,
  professorName,
  memberCount,
  listCount,
}: {
  id: string;
  name: string;
  description?: string;
  inviteCode?: string;
  professorName?: string;
  memberCount?: number;
  listCount: number;
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 gap-4">
      <div>
        <h2 className="font-semibold text-base leading-tight">{name}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
        {professorName && (
          <p className="mt-1 text-xs text-muted-foreground">
            Prof. {professorName}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs text-muted-foreground">
          {memberCount !== undefined && (
            <span>{memberCount} aluno{memberCount !== 1 ? "s" : ""}</span>
          )}
          <span>{listCount} lista{listCount !== 1 ? "s" : ""}</span>
          {inviteCode && (
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
              {inviteCode}
            </span>
          )}
        </div>
        <Link
          href={`/turmas/${id}`}
          className="text-xs font-medium text-primary hover:underline"
        >
          Ver turma →
        </Link>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

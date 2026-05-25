import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

type TeacherClass = {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  members: { count: number }[];
  assignments: { count: number }[];
};

type StudentClassMember = {
  class:
    | {
        id: string;
        name: string;
        description: string | null;
        owner: { display_name: string } | null;
        assignments: { count: number }[];
      }
    | null;
};

export default async function TurmasPage() {
  const profile = await getProfile();

  if (!profile) {
    return (
      <ErrorState message="Nao foi possivel carregar seu perfil. Entre novamente." />
    );
  }

  const isProf = profile.role === "professor" || profile.role === "admin";
  const supabase = await createClient();
  let errorMessage: string | null = null;
  let teacherClasses: TeacherClass[] = [];
  let studentClasses: StudentClassMember[] = [];

  if (isProf) {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select(
          "id, name, description, invite_code, created_at, members:class_members(count), assignments:assignments(count)",
        )
        .eq("owner_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) errorMessage = error.message;
      teacherClasses = (data ?? []) as unknown as TeacherClass[];
    } catch (error) {
      errorMessage =
        error instanceof Error
          ? error.message
          : "Nao foi possivel conectar ao Supabase.";
    }

    if (errorMessage) return <ErrorState message={errorMessage} />;

    return (
      <TurmasShell
        title="Minhas turmas"
        description="Gerencie suas turmas e listas de exercicios."
        actionHref="/turmas/nova"
        actionLabel="+ Nova turma"
      >
        {teacherClasses.length === 0 && (
          <EmptyState
            title="Nenhuma turma ainda"
            description='Clique em "Nova turma" para comecar.'
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teacherClasses.map((turma) => (
            <TurmaCard
              key={turma.id}
              id={turma.id}
              name={turma.name}
              description={turma.description ?? undefined}
              inviteCode={turma.invite_code}
              memberCount={turma.members?.[0]?.count ?? 0}
              listCount={turma.assignments?.[0]?.count ?? 0}
            />
          ))}
        </div>
      </TurmasShell>
    );
  }

  try {
    const { data, error } = await supabase
      .from("class_members")
      .select(
        "joined_at, class:classes!class_id(id, name, description, owner:profiles!owner_id(display_name), assignments:assignments(count))",
      )
      .eq("student_id", profile.id)
      .order("joined_at", { ascending: false });

    if (error) errorMessage = error.message;
    studentClasses = (data ?? []) as unknown as StudentClassMember[];
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Nao foi possivel conectar ao Supabase.";
  }

  if (errorMessage) return <ErrorState message={errorMessage} />;

  return (
    <TurmasShell
      title="Minhas turmas"
      description="Turmas em que voce esta inscrito."
      actionHref="/turmas/entrar"
      actionLabel="Entrar com codigo"
    >
      {studentClasses.length === 0 && (
        <EmptyState
          title="Nenhuma turma ainda"
          description='Peca o codigo de convite ao seu professor e clique em "Entrar com codigo".'
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {studentClasses.flatMap((member) => {
          const cls = member.class;
          if (!cls) return [];

          return (
            <TurmaCard
              key={cls.id}
              id={cls.id}
              name={cls.name}
              description={cls.description ?? undefined}
              professorName={cls.owner?.display_name}
              listCount={cls.assignments?.[0]?.count ?? 0}
            />
          );
        })}
      </div>
    </TurmasShell>
  );
}

function TurmasShell({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Link href={actionHref}>
          <Button>{actionLabel}</Button>
        </Link>
      </div>
      {children}
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
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5">
      <div>
        <h2 className="text-base font-semibold leading-tight">{name}</h2>
        {description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {professorName && (
          <p className="mt-1 text-xs text-muted-foreground">
            Prof. {professorName}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {memberCount !== undefined && (
            <span>
              {memberCount} aluno{memberCount !== 1 ? "s" : ""}
            </span>
          )}
          <span>
            {listCount} lista{listCount !== 1 ? "s" : ""}
          </span>
          {inviteCode && (
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
              {inviteCode}
            </span>
          )}
        </div>
        <Link
          href={`/turmas/${id}`}
          className="text-xs font-medium text-primary hover:underline"
        >
          Ver turma
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

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-danger/40 bg-danger/10 p-6">
      <h1 className="text-lg font-semibold">Nao foi possivel carregar turmas</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

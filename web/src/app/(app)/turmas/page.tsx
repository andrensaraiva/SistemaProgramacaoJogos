import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

type TeacherClass = {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  owner_id: string;
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
  const isCoordenador = profile.role === "coordenador";
  const supabase = await createClient();
  let errorMessage: string | null = null;
  let teacherClasses: TeacherClass[] = [];
  let studentClasses: StudentClassMember[] = [];

  const baseSelect =
    "id, name, description, invite_code, created_at, owner_id, members:class_members(count), assignments:assignments(count)";

  // Coordenador supervisiona TODAS as turmas.
  if (isCoordenador) {
    const { data, error } = await supabase
      .from("classes")
      .select(baseSelect)
      .order("created_at", { ascending: false });
    if (error) return <ErrorState message={error.message} />;
    const todas = (data ?? []) as unknown as TeacherClass[];
    return (
      <TurmasShell title="Turmas" description="Todas as turmas da instituição. Entre para gerenciar.">
        {todas.length === 0 && (
          <EmptyState title="Nenhuma turma" description="Ainda não há turmas cadastradas." />
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {todas.map((turma) => (
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

  if (isProf) {
    try {
      // Turmas próprias (dono) + turmas em que é co-professor (co-docência).
      const { data: coRows } = await supabase
        .from("class_teachers")
        .select("class_id")
        .eq("teacher_id", profile.id);
      const coIds = (coRows ?? []).map((r) => r.class_id);

      const orFilter = coIds.length
        ? `owner_id.eq.${profile.id},id.in.(${coIds.join(",")})`
        : `owner_id.eq.${profile.id}`;

      const { data, error } = await supabase
        .from("classes")
        .select(baseSelect)
        .or(orFilter)
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
              coDocente={turma.owner_id !== profile.id}
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
  actionHref?: string;
  actionLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          actionHref && actionLabel ? (
            <Link href={actionHref}>
              <Button>{actionLabel}</Button>
            </Link>
          ) : undefined
        }
      />
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
  coDocente,
}: {
  id: string;
  name: string;
  description?: string;
  inviteCode?: string;
  professorName?: string;
  memberCount?: number;
  listCount: number;
  coDocente?: boolean;
}) {
  return (
    <Link href={`/turmas/${id}`} className="group">
      <Card className="flex h-full flex-col justify-between gap-4 transition-colors group-hover:border-primary/50">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold leading-tight">{name}</h2>
            {coDocente && <Badge tone="accent">Co-docência</Badge>}
          </div>
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

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {memberCount !== undefined && (
            <Badge tone="neutral">
              {memberCount} aluno{memberCount !== 1 ? "s" : ""}
            </Badge>
          )}
          <Badge tone="neutral">
            {listCount} lista{listCount !== 1 ? "s" : ""}
          </Badge>
          {inviteCode && (
            <span className="ml-auto rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
              {inviteCode}
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}

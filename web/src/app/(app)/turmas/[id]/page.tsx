import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmForm } from "@/components/confirm-form";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { excluirTurma, sairDaTurma } from "@/lib/turmas/actions";
import { CopyButton } from "./_copy-button";

type Params = Promise<{ id: string }>;

export default async function TurmaPage({ params }: { params: Params }) {
  const { id } = await params;
  const profile = await getProfile();

  const supabase = await createClient();

  const { data: turma, error: turmaError } = await supabase
    .from("classes")
    .select(
      "id, name, description, invite_code, owner_id, owner:profiles!owner_id(display_name)",
    )
    .eq("id", id)
    .single();

  // Erro de banco (ex.: RLS) não é "não encontrado" — não mascarar como 404.
  if (turmaError && turmaError.code !== "PGRST116") {
    throw new Error(`Falha ao carregar a turma: ${turmaError.message}`);
  }
  if (!turma) notFound();

  const isOwner = turma.owner_id === profile?.id;

  const { data: membros } = await supabase
    .from("class_members")
    .select("joined_at, student:profiles!student_id(id, display_name, xp, level)")
    .eq("class_id", id)
    .order("joined_at");

  const { data: listas } = await supabase
    .from("assignments")
    .select("id, title, kind, due_at, created_at")
    .eq("class_id", id)
    .order("created_at", { ascending: false });

  const owner = turma.owner as unknown as { display_name: string };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/turmas"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Turmas
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{turma.name}</h1>
          {turma.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {turma.description}
            </p>
          )}
          {!isOwner && (
            <p className="mt-1 text-xs text-muted-foreground">
              Prof. {owner.display_name}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Link href={`/turmas/${id}/ranking`}>
            <Button variant="secondary">Ranking</Button>
          </Link>
          {!isOwner && (
            <Link href={`/turmas/${id}/minha-frequencia`}>
              <Button variant="secondary">Minha frequência</Button>
            </Link>
          )}
          {isOwner && (
            <>
              <Link href={`/turmas/${id}/grupos`}>
                <Button variant="secondary">Grupos</Button>
              </Link>
              <Link href={`/turmas/${id}/editar`}>
                <Button variant="secondary">Editar</Button>
              </Link>
              <ConfirmForm
                action={excluirTurma}
                message="Excluir esta turma? Isso remove todos os membros e listas."
              >
                <input type="hidden" name="id" value={id} />
                <Button type="submit" variant="danger">Excluir</Button>
              </ConfirmForm>
            </>
          )}
          {!isOwner && (
            <ConfirmForm action={sairDaTurma} message="Sair desta turma?">
              <input type="hidden" name="class_id" value={id} />
              <Button type="submit" variant="ghost">Sair da turma</Button>
            </ConfirmForm>
          )}
        </div>
      </div>

      {/* Invite code (professor only) */}
      {isOwner && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <div className="text-sm text-muted-foreground">Código de convite:</div>
          <code className="font-mono text-base font-semibold tracking-wider">
            {turma.invite_code}
          </code>
          <CopyButton text={turma.invite_code} />
        </div>
      )}

      {/* Listas de exercícios */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Listas de exercícios</h2>
          {isOwner && (
            <Link href={`/turmas/${id}/listas/nova`}>
              <Button>+ Nova lista</Button>
            </Link>
          )}
        </div>

        {!listas?.length && (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {isOwner
              ? 'Nenhuma lista ainda. Clique em "+ Nova lista" para criar.'
              : "Nenhuma lista atribuída ainda."}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {listas?.map((lista) => (
            <Link
              key={lista.id}
              href={`/turmas/${id}/listas/${lista.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/40 transition-colors"
            >
              <div>
                <span className="font-medium">{lista.title}</span>
                <span className="ml-2 text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground capitalize">
                  {lista.kind}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {lista.due_at
                  ? `Prazo: ${new Date(lista.due_at).toLocaleDateString("pt-BR")}`
                  : "Sem prazo"}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Unidades curriculares + frequência (professor only) */}
      {isOwner && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Unidades curriculares</h2>
            <Link href={`/turmas/${id}/ucs`}>
              <Button variant="secondary">Gerenciar UCs e frequência</Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Vincule as unidades curriculares que você leciona nesta turma,
            escolha o plano de ensino e controle a frequência (presença, falta e
            atraso) por aula.
          </p>
        </section>
      )}

      {/* Membros (professor only) */}
      {isOwner && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">
            Alunos ({membros?.length ?? 0})
          </h2>

          {!membros?.length && (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Nenhum aluno ainda. Compartilhe o código de convite acima.
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {membros?.map((m) => {
              const student = m.student as unknown as {
                id: string;
                display_name: string;
                xp: number;
                level: number;
              };
              return (
                <div
                  key={student.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {student.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-sm">
                      {student.display_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Nível {student.level} · {student.xp} XP
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

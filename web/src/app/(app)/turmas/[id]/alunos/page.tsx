import { notFound, redirect } from "next/navigation";

import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import { CadastroAlunos, PedidoResetAluno } from "./_client";

type Params = Promise<{ id: string }>;

export default async function AlunosPage({ params }: { params: Params }) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const supabase = await createClient();
  const { data: turma } = await supabase
    .from("classes")
    .select("id, name, owner_id")
    .eq("id", id)
    .single();
  if (!turma) notFound();

  const isOwner = turma.owner_id === profile.id || profile.role === "admin";
  if (!isOwner) {
    redirect(`/turmas/${id}`);
  }

  const { data: membros } = await supabase
    .from("class_members")
    .select(
      "student:profiles!student_id(id, display_name, institutional_email, personal_email, profile_completed)",
    )
    .eq("class_id", id);

  const alunos = (membros ?? [])
    .map((m) => m.student as unknown as {
      id: string;
      display_name: string;
      institutional_email: string | null;
      personal_email: string | null;
      profile_completed: boolean;
    } | null)
    .filter((a): a is NonNullable<typeof a> => a !== null)
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  // Pedidos de reset pendentes dos alunos desta turma (RLS já filtra para o dono).
  const alunoIds = alunos.map((a) => a.id);
  const { data: pedidos } = alunoIds.length
    ? await supabase
        .from("password_reset_requests")
        .select("id, requester_id")
        .eq("status", "pendente")
        .in("requester_id", alunoIds)
    : { data: [] };
  const pedidoPorAluno = new Map(
    (pedidos ?? []).map((p) => [p.requester_id, p.id]),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Alunos — ${turma.name}`}
        description="Cadastre alunos um a um ou em massa. Cada aluno recebe uma senha temporária e troca no primeiro acesso."
      />

      <Card>
        <CardHeader title="Cadastrar alunos" />
        <CadastroAlunos classId={id} />
      </Card>

      <Card>
        <CardHeader
          title="Alunos matriculados"
          description={`${alunos.length} aluno(s).`}
        />
        {alunos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aluno ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {alunos.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{a.display_name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {a.institutional_email ?? a.personal_email ?? "—"}
                    {!a.profile_completed && " · aguardando primeiro acesso"}
                  </div>
                </div>
                <PedidoResetAluno
                  alunoId={a.id}
                  nome={a.display_name}
                  pedidoId={pedidoPorAluno.get(a.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

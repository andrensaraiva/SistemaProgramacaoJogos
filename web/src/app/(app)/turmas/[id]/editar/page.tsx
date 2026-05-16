import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { EditarTurmaForm } from "./_form";

type Params = Promise<{ id: string }>;

export default async function EditarTurmaPage({ params }: { params: Params }) {
  const { id } = await params;
  const profile = await getProfile();
  const isProf =
    profile?.role === "professor" || profile?.role === "admin";

  if (!isProf) redirect(`/turmas/${id}`);

  const supabase = await createClient();
  const { data: turma } = await supabase
    .from("classes")
    .select("id, name, description, owner_id")
    .eq("id", id)
    .single();

  if (!turma || turma.owner_id !== profile?.id) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <Link
          href={`/turmas/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {turma.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Editar turma</h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <EditarTurmaForm
          id={id}
          initialName={turma.name}
          initialDescription={turma.description ?? undefined}
        />
      </div>
    </div>
  );
}

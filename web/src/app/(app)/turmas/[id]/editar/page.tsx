import Link from "next/link";
import { notFound } from "next/navigation";

import { requireGerenciarTurma } from "@/lib/turmas/access";
import { createClient } from "@/lib/supabase/server";
import { EditarTurmaForm } from "./_form";

type Params = Promise<{ id: string }>;

export default async function EditarTurmaPage({ params }: { params: Params }) {
  const { id } = await params;
  // Gestão: dono, co-docente, coordenador ou admin editam a turma.
  await requireGerenciarTurma(id);

  const supabase = await createClient();
  const { data: turma } = await supabase
    .from("classes")
    .select("id, name, description, owner_id")
    .eq("id", id)
    .single();

  if (!turma) notFound();

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

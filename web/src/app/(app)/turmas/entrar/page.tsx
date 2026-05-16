import Link from "next/link";
import { redirect } from "next/navigation";

import { isProfessor } from "@/lib/auth/dal";
import { EntrarTurmaForm } from "./_form";

export default async function EntrarTurmaPage() {
  if (await isProfessor()) redirect("/turmas");

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-6">
        <Link
          href="/turmas"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Turmas
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Entrar em uma turma</h1>
        <p className="text-sm text-muted-foreground">
          Peça o código de 8 letras ao seu professor.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <EntrarTurmaForm />
      </div>
    </div>
  );
}

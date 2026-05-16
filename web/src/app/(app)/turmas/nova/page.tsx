import Link from "next/link";
import { redirect } from "next/navigation";

import { isProfessor } from "@/lib/auth/dal";
import { NovaTurmaForm } from "./_form";

export default async function NovaTurmaPage() {
  if (!(await isProfessor())) redirect("/turmas");

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <Link
          href="/turmas"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Turmas
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Nova turma</h1>
        <p className="text-sm text-muted-foreground">
          Um código de convite único será gerado automaticamente.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <NovaTurmaForm />
      </div>
    </div>
  );
}

import Link from "next/link";

import { requireCapability } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { NovaTurmaForm } from "./_form";

export default async function NovaTurmaPage() {
  // Professor (cria pra si), coordenador e admin (escolhem o dono) podem criar.
  const profile = await requireCapability("gerenciar_turma");

  // Gestão escolhe o professor dono → carrega a lista. Professor comum vira dono.
  const ehGestao = profile.role === "coordenador" || profile.role === "admin";
  let professores: { id: string; display_name: string }[] = [];
  if (ehGestao) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("id, display_name")
      .eq("role", "professor")
      .is("disabled_at", null)
      .order("display_name");
    professores = data ?? [];
  }

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
        <NovaTurmaForm professores={professores} />
      </div>
    </div>
  );
}

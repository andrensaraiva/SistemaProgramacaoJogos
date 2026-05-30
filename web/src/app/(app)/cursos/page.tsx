import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export default async function CursosPage() {
  const profile = await getProfile();
  const isProf = profile?.role === "professor" || profile?.role === "admin";
  const supabase = await createClient();

  const { data: cursos } = await supabase
    .from("courses")
    .select(
      "id, name, eixo, carga_horaria_total, author_id, author:profiles!author_id(display_name)",
    )
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Cursos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Planos Pedagógicos de Curso (PPC) — módulos, unidades curriculares e
            planos de ensino compartilhados entre professores.
          </p>
        </div>
        {isProf && (
          <Link href="/cursos/importar">
            <Button>+ Importar PPC (IA)</Button>
          </Link>
        )}
      </div>

      {!cursos?.length && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {isProf
            ? 'Nenhum curso ainda. Clique em "+ Importar PPC (IA)" para colar um PPC e estruturá-lo automaticamente.'
            : "Nenhum curso disponível ainda."}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {cursos?.map((c) => {
          const author = c.author as unknown as { display_name: string } | null;
          return (
            <Link
              key={c.id}
              href={`/cursos/${c.id}`}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 hover:border-primary/40"
            >
              <div className="font-semibold">{c.name}</div>
              <div className="text-xs text-muted-foreground">
                {c.eixo ? `${c.eixo} · ` : ""}
                {c.carga_horaria_total ? `${c.carga_horaria_total}h · ` : ""}
                {author?.display_name ? `por ${author.display_name}` : ""}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

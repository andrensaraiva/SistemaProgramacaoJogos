import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
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
      <PageHeader
        title="Cursos"
        description="Planos Pedagógicos de Curso (PPC) — módulos, unidades curriculares e planos de ensino compartilhados entre professores."
        actions={
          isProf ? (
            <Link href="/cursos/importar">
              <Button>+ Importar PPC (IA)</Button>
            </Link>
          ) : undefined
        }
      />

      {!cursos?.length && (
        <EmptyState
          title="Nenhum curso ainda"
          description={
            isProf
              ? 'Clique em "+ Importar PPC (IA)" para colar um PPC e estruturá-lo automaticamente.'
              : "Nenhum curso disponível ainda."
          }
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {cursos?.map((c) => {
          const author = c.author as unknown as { display_name: string } | null;
          return (
            <Link key={c.id} href={`/cursos/${c.id}`} className="group">
              <Card className="flex h-full flex-col gap-2 transition-colors group-hover:border-primary/50">
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.eixo ? `${c.eixo} · ` : ""}
                  {c.carga_horaria_total ? `${c.carga_horaria_total}h · ` : ""}
                  {author?.display_name ? `por ${author.display_name}` : ""}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

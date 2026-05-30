import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ConfirmForm } from "@/components/confirm-form";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/dal";
import { excluirCurso } from "@/lib/curriculum/actions";
import { createClient } from "@/lib/supabase/server";

export default async function CursoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: curso } = await supabase
    .from("courses")
    .select(
      "id, name, eixo, carga_horaria_total, author_id, author:profiles!author_id(display_name)",
    )
    .eq("id", id)
    .single();

  if (!curso) notFound();

  const { data: modules } = await supabase
    .from("course_modules")
    .select("id, name, ord, units:curricular_units(id, title, carga_horaria_h, ord)")
    .eq("course_id", id)
    .order("ord");

  const author = curso.author as unknown as { display_name: string } | null;
  const isOwner = profile?.id === curso.author_id;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[{ label: "Cursos", href: "/cursos" }, { label: curso.name }]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{curso.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {curso.eixo ? `${curso.eixo} · ` : ""}
            {curso.carga_horaria_total ? `${curso.carga_horaria_total}h · ` : ""}
            {author?.display_name ? `por ${author.display_name}` : ""}
          </p>
        </div>
        {isOwner && (
          <ConfirmForm
            action={excluirCurso}
            message="Excluir este curso e tudo dentro dele? Esta ação não pode ser desfeita."
          >
            <input type="hidden" name="id" value={curso.id} />
            <Button type="submit" variant="danger">
              Excluir curso
            </Button>
          </ConfirmForm>
        )}
      </div>

      <div className="flex flex-col gap-5">
        {modules?.map((mod) => {
          const units = (
            mod.units as { id: string; title: string; carga_horaria_h: number | null; ord: number }[]
          )
            .slice()
            .sort((a, b) => a.ord - b.ord);
          return (
            <section key={mod.id} className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">{mod.name}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {units.map((u) => (
                  <Link
                    key={u.id}
                    href={`/cursos/${id}/uc/${u.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/40"
                  >
                    <span className="text-sm font-medium">{u.title}</span>
                    {u.carga_horaria_h != null && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {u.carga_horaria_h}h
                      </span>
                    )}
                  </Link>
                ))}
                {!units.length && (
                  <p className="text-xs text-muted-foreground">
                    Sem unidades curriculares.
                  </p>
                )}
              </div>
            </section>
          );
        })}
        {!modules?.length && (
          <p className="text-sm text-muted-foreground">
            Este curso ainda não tem módulos.
          </p>
        )}
      </div>
    </div>
  );
}

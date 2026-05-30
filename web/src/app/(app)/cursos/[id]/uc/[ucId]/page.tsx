import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import { PlanosDaUc } from "./_plans";

type KnowledgeRow = {
  id: string;
  parent_id: string | null;
  text: string;
  ord: number;
};

export default async function UcPage({
  params,
}: {
  params: Promise<{ id: string; ucId: string }>;
}) {
  const { id, ucId } = await params;
  const profile = await getProfile();
  const isProf = profile?.role === "professor" || profile?.role === "admin";
  const supabase = await createClient();

  const { data: uc } = await supabase
    .from("curricular_units")
    .select(
      "id, title, carga_horaria_h, objetivo_geral, module:course_modules!module_id(name, course:courses!course_id(id, name))",
    )
    .eq("id", ucId)
    .single();

  if (!uc) notFound();

  const [{ data: caps }, { data: knowledge }, { data: bib }, { data: plans }] =
    await Promise.all([
      supabase
        .from("uc_capabilities")
        .select("id, code, description, kind, ord")
        .eq("uc_id", ucId)
        .order("ord"),
      supabase
        .from("uc_knowledge")
        .select("id, parent_id, text, ord")
        .eq("uc_id", ucId)
        .order("ord"),
      supabase
        .from("uc_bibliography")
        .select("id, reference, tipo, ord")
        .eq("uc_id", ucId)
        .order("ord"),
      supabase
        .from("teaching_plans")
        .select(
          "id, title, owner_id, cloned_from, owner:profiles!owner_id(display_name)",
        )
        .eq("uc_id", ucId)
        .order("created_at"),
    ]);

  const mod = uc.module as unknown as {
    name: string;
    course: { id: string; name: string };
  } | null;

  const roots = (knowledge ?? []).filter((k) => !k.parent_id);
  const childrenOf = (pid: string) =>
    (knowledge ?? []).filter((k) => k.parent_id === pid);

  const myPlans = (plans ?? []).filter((p) => p.owner_id === profile?.id);
  const otherPlans = (plans ?? []).filter((p) => p.owner_id !== profile?.id);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Cursos", href: "/cursos" },
          {
            label: mod?.course.name ?? "Curso",
            href: mod ? `/cursos/${mod.course.id}` : `/cursos/${id}`,
          },
          { label: uc.title },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold">{uc.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mod?.name ? `${mod.name} · ` : ""}
          {uc.carga_horaria_h != null ? `${uc.carga_horaria_h}h` : ""}
        </p>
      </div>

      {uc.objetivo_geral && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Objetivo geral
          </h2>
          <p className="text-sm whitespace-pre-line">{uc.objetivo_geral}</p>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {!!caps?.length && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Habilidades / Capacidades
            </h2>
            <ul className="flex flex-col gap-2 text-sm">
              {caps.map((c) => (
                <li key={c.id} className="flex gap-2">
                  {c.code && (
                    <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                      {c.code}
                    </span>
                  )}
                  <span>{c.description}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!!roots.length && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Objetos de conhecimento
            </h2>
            <ul className="flex flex-col gap-1.5 text-sm">
              {roots.map((k: KnowledgeRow) => (
                <li key={k.id}>
                  <span className="font-medium">{k.text}</span>
                  {!!childrenOf(k.id).length && (
                    <ul className="mt-1 ml-4 flex flex-col gap-0.5 text-muted-foreground">
                      {childrenOf(k.id).map((c) => (
                        <li key={c.id}>– {c.text}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {!!bib?.length && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Bibliografia
          </h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {bib.map((b) => (
              <li key={b.id}>
                <span className="mr-2 text-xs uppercase text-muted-foreground">
                  {b.tipo}
                </span>
                {b.reference}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isProf && (
        <PlanosDaUc
          ucId={ucId}
          myPlans={myPlans.map((p) => ({ id: p.id, title: p.title }))}
          otherPlans={otherPlans.map((p) => ({
            id: p.id,
            title: p.title,
            author:
              (p.owner as unknown as { display_name: string } | null)
                ?.display_name ?? "Colega",
          }))}
        />
      )}
    </div>
  );
}

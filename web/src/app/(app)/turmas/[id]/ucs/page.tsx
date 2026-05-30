import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ConfirmForm } from "@/components/confirm-form";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/dal";
import { desvincularUcDaTurma } from "@/lib/curriculum/actions";
import { createClient } from "@/lib/supabase/server";

import { VincularUcForm } from "./_vincular-form";

export default async function TurmaUcsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: turma } = await supabase
    .from("classes")
    .select("id, name, owner_id")
    .eq("id", id)
    .single();
  if (!turma) notFound();
  if (!profile || turma.owner_id !== profile.id) redirect(`/turmas/${id}`);

  // UCs já vinculadas a esta turma.
  const { data: linked } = await supabase
    .from("class_units")
    .select(
      "id, serie, uc:curricular_units!uc_id(id, title, carga_horaria_h), plan:teaching_plans!teaching_plan_id(id, title)",
    )
    .eq("class_id", id);

  // Catálogo de UCs (todos os cursos visíveis ao professor).
  const { data: courses } = await supabase
    .from("courses")
    .select(
      "id, name, modules:course_modules(name, ord, units:curricular_units(id, title, ord))",
    )
    .order("name");

  // Planos de ensino do próprio professor (para escolher ao vincular).
  const { data: myPlans } = await supabase
    .from("teaching_plans")
    .select("id, title, uc_id")
    .eq("owner_id", profile.id);

  const ucOptions =
    courses?.flatMap((c) =>
      (c.modules as { name: string; ord: number; units: { id: string; title: string; ord: number }[] }[])
        .slice()
        .sort((a, b) => a.ord - b.ord)
        .flatMap((m) =>
          m.units
            .slice()
            .sort((a, b) => a.ord - b.ord)
            .map((u) => ({
              id: u.id,
              label: `${c.name} › ${m.name} › ${u.title}`,
            })),
        ),
    ) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Turmas", href: "/turmas" },
          { label: turma.name, href: `/turmas/${id}` },
          { label: "Unidades curriculares" },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold">Unidades curriculares</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Turma {turma.name}. Vincule as UCs que você leciona e abra a frequência
          de cada uma.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        {linked?.length ? (
          linked.map((cu) => {
            const uc = cu.uc as unknown as {
              id: string;
              title: string;
              carga_horaria_h: number | null;
            } | null;
            const plan = cu.plan as unknown as { id: string; title: string } | null;
            return (
              <div
                key={cu.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div>
                  <div className="font-semibold">{uc?.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {cu.serie ? `${cu.serie} · ` : ""}
                    {uc?.carga_horaria_h ? `${uc.carga_horaria_h}h · ` : ""}
                    {plan ? `Plano: ${plan.title}` : "Sem plano vinculado"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/turmas/${id}/ucs/${cu.id}/frequencia`}>
                    <Button variant="secondary">Frequência</Button>
                  </Link>
                  <ConfirmForm
                    action={desvincularUcDaTurma}
                    message="Desvincular esta UC da turma? A frequência registrada será removida."
                  >
                    <input type="hidden" name="class_unit_id" value={cu.id} />
                    <input type="hidden" name="class_id" value={id} />
                    <Button type="submit" variant="ghost">
                      ✕
                    </Button>
                  </ConfirmForm>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma UC vinculada ainda.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Vincular nova UC</h2>
        <VincularUcForm
          classId={id}
          ucOptions={ucOptions}
          myPlans={myPlans ?? []}
        />
      </section>
    </div>
  );
}

import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import { PlanoEditor } from "./_editor";

export default async function PlanoPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("teaching_plans")
    .select(
      "id, title, owner_id, uc:curricular_units!uc_id(id, title, module:course_modules!module_id(course:courses!course_id(id, name)))",
    )
    .eq("id", planId)
    .single();

  if (!plan) notFound();

  const isOwner = plan.owner_id === profile?.id;
  if (!isOwner) {
    // Quem não é dono só pode visualizar/clonar pela página da UC.
    const uc = plan.uc as unknown as { id: string } | null;
    redirect(uc ? `/cursos/_/uc/${uc.id}` : "/cursos");
  }

  const { data: blocks } = await supabase
    .from("teaching_plan_blocks")
    .select(
      "id, title, aula_inicio, aula_fim, conteudo, apresentacao_url, atividade, criterios, ord",
    )
    .eq("plan_id", planId)
    .order("ord");

  const uc = plan.uc as unknown as {
    id: string;
    title: string;
    module: { course: { id: string; name: string } };
  } | null;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Cursos", href: "/cursos" },
          uc
            ? { label: uc.module.course.name, href: `/cursos/${uc.module.course.id}` }
            : { label: "Curso" },
          uc
            ? { label: uc.title, href: `/cursos/${uc.module.course.id}/uc/${uc.id}` }
            : { label: "UC" },
          { label: plan.title },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold">{plan.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plano de ensino {uc ? `· ${uc.title}` : ""}. Divida a UC em blocos de
          aulas com conteúdo, apresentação e atividade.
        </p>
      </div>

      <PlanoEditor planId={planId} blocks={blocks ?? []} />
    </div>
  );
}

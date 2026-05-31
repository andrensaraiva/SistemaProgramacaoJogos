import { redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth/dal";
import { getEnabledLanguages } from "@/lib/exercises/languages";

import { NovoExercicioForm } from "./_form";

export default async function NovoExercicioPage() {
  const profile = await getProfile();
  const isProfessor = profile?.role === "professor" || profile?.role === "admin";
  if (!isProfessor) redirect("/exercicios");

  const langs = await getEnabledLanguages();

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Exercícios", href: "/exercicios" },
          { label: "Novo exercício" },
        ]}
      />
      <PageHeader
        title="Novo exercício"
        description="Crie um exercício de código, uma entrega de apresentação (link) ou um modelo de resposta para o aluno preencher."
      />
      <NovoExercicioForm
        languages={langs.map((l) => ({ id: l.id, label: l.label }))}
      />
    </div>
  );
}

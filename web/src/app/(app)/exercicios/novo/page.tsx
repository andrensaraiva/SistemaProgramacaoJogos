import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { requireCapability } from "@/lib/auth/guard";
import { getEnabledLanguages } from "@/lib/exercises/languages";
import { ferramentasHabilitadas } from "@/lib/canvas/tools";
import { getInstitutionSettings } from "@/lib/reports/settings";
import { getUcOptions } from "@/lib/curriculum/units";
import { createClient } from "@/lib/supabase/server";

import { NovoExercicioForm } from "./_form";

export default async function NovoExercicioPage() {
  await requireCapability("gerenciar_curso");

  const supabase = await createClient();
  const [langs, settings, ucOptions] = await Promise.all([
    getEnabledLanguages(),
    getInstitutionSettings(),
    getUcOptions(supabase),
  ]);
  const creativeTools = ferramentasHabilitadas(settings.tools).map((t) => ({
    kind: t.kind,
    label: t.label,
    hint: t.hint,
    defaultConfig: { width: t.defaultConfig.width, height: t.defaultConfig.height },
  }));

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
        creativeTools={creativeTools}
        ucOptions={ucOptions.map((u) => ({ id: u.id, label: u.label }))}
      />
    </div>
  );
}

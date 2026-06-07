import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireCapability } from "@/lib/auth/guard";
import { getInstitutionSettings } from "@/lib/reports/settings";

import { ConfigForm } from "./_form";

export default async function ConfiguracoesPage() {
  await requireCapability("gerenciar_config");

  const settings = await getInstitutionSettings();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configurações"
        description="Parâmetros da instituição usados nos relatórios e na classificação dos alunos."
      />

      <Card>
        <CardHeader
          title="Instituição e critérios de aprovação"
          description="Escala de nota 0–10. A situação dos alunos nos relatórios usa estes limiares."
        />
        <ConfigForm
          institutionName={settings.institutionName}
          notaAprovacao={settings.thresholds.aprovacao}
          notaRecuperacaoMin={settings.thresholds.recuperacaoMin}
          freqMinPct={settings.thresholds.freqMinPct}
          senhaSufixo={settings.senhaSufixo}
          toolPixelArt={settings.tools.tool_pixel_art}
          toolVetor={settings.tools.tool_vetor}
          toolArteDigital={settings.tools.tool_arte_digital}
          toolBlocos={settings.tools.tool_blocos}
        />
      </Card>
    </div>
  );
}

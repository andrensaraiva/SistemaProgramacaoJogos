import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireCapability } from "@/lib/auth/guard";
import { listarFeriados } from "@/lib/calendar/holidays";
import { HOLIDAY_KINDS } from "@/lib/calendar/kinds";

import { NovoFeriadoForm, RemoverFeriadoButton } from "./_client";

const KIND_LABEL: Record<string, string> = Object.fromEntries(
  HOLIDAY_KINDS.map((k) => [k.value, k.label]),
);

export default async function FeriadosPage() {
  await requireCapability("gerenciar_feriados");

  const feriados = await listarFeriados();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Feriados e eventos"
        description="Datas não-letivas usadas no calendário do curso (feriados, recessos, férias, capacitação, conselho)."
      />

      <Card>
        <CardHeader title="Adicionar" />
        <NovoFeriadoForm />
      </Card>

      <Card>
        <CardHeader title="Calendário institucional" description={`${feriados.length} data(s).`} />
        {feriados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum feriado cadastrado.</p>
        ) : (
          <ul className="divide-y divide-border">
            {feriados.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className="font-medium">
                    {new Date(f.date + "T12:00:00").toLocaleDateString("pt-BR")}
                  </span>{" "}
                  — {f.name}{" "}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {KIND_LABEL[f.kind] ?? f.kind}
                  </span>
                </div>
                <RemoverFeriadoButton id={f.id} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

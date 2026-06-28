import Link from "next/link";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireCapability } from "@/lib/auth/guard";
import { listarTurmas } from "@/lib/admin/actions";

export default async function RelatorioTurmasLista() {
  await requireCapability("ver_relatorios");

  const turmas = await listarTurmas();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Relatórios por turma" description="Escolha uma turma para ver o consolidado por UC." />
      <Link href="/admin/relatorios" className="text-sm text-muted-foreground hover:text-foreground">
        ← Relatórios
      </Link>

      {turmas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma turma cadastrada.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {turmas.map((t) => (
            <Card key={t.id} className="flex flex-col gap-3">
              <div>
                <div className="font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground">
                  Prof. {t.owner?.display_name ?? "—"}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/relatorios/turmas/${t.id}`}
                  className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/70"
                >
                  📊 Relatório
                </Link>
                <Link
                  href={`/turmas/${t.id}/calendario`}
                  className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/70"
                >
                  📅 Calendário
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

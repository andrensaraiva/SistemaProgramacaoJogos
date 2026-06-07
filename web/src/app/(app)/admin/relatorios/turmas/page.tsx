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
            <Link key={t.id} href={`/admin/relatorios/turmas/${t.id}`}>
              <Card className="transition-colors hover:border-primary/50">
                <div className="font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground">
                  Prof. {t.owner?.display_name ?? "—"}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

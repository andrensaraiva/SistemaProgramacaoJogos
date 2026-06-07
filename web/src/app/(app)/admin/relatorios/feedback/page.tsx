import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireCapability } from "@/lib/auth/guard";
import { getFeedbackIndex } from "@/lib/reports/feedback";
import { listarTurmas } from "@/lib/admin/actions";

export default async function RelatorioFeedbackIndex() {
  await requireCapability("ver_relatorios");

  const [professores, turmas] = await Promise.all([getFeedbackIndex(), listarTurmas()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Feedback dos alunos"
        description="Avaliações anônimas dos alunos sobre os professores. Você nunca vê quem enviou."
      />
      <Link href="/admin/relatorios" className="text-sm text-muted-foreground hover:text-foreground">
        ← Relatórios
      </Link>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Por professor (todas as turmas)</h2>
        <Table>
          <THead>
            <TH>Professor</TH>
            <TH className="text-center">Média</TH>
            <TH className="text-center">Avaliações</TH>
            <TH></TH>
          </THead>
          <TBody>
            {professores.map((p) => (
              <TR key={p.id}>
                <TD className="font-medium">{p.nome}</TD>
                <TD className="text-center">{p.media != null ? `★ ${p.media}` : "—"}</TD>
                <TD className="text-center">{p.total}</TD>
                <TD className="text-center">
                  {p.total > 0 && (
                    <Link href={`/admin/relatorios/feedback/professor/${p.id}`} className="text-sm text-primary hover:underline">
                      Detalhar
                    </Link>
                  )}
                </TD>
              </TR>
            ))}
            {professores.length === 0 && (
              <TR>
                <TD className="text-muted-foreground">Nenhum professor.</TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Por turma</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {turmas.map((t) => (
            <Link key={t.id} href={`/admin/relatorios/feedback/turma/${t.id}`}>
              <Button variant="secondary" className="w-full justify-start">
                {t.name}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

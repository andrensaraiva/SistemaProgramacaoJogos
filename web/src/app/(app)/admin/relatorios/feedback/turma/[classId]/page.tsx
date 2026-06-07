import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/print-button";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireCapability } from "@/lib/auth/guard";
import { getClassFeedback } from "@/lib/reports/feedback";

import { PRINT_CSS } from "../../../_print";

export default async function FeedbackTurma({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  await requireCapability("ver_relatorios");

  const r = await getClassFeedback(classId);
  if (!r) notFound();
  const hoje = new Date().toLocaleDateString("pt-BR");

  return (
    <div className="relatorio-page flex flex-col gap-6">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="flex items-center justify-between gap-3 no-print">
        <Link href="/admin/relatorios/feedback" className="text-sm text-muted-foreground hover:text-foreground">
          ← Feedback
        </Link>
        <PrintButton />
      </div>

      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold">Feedback da turma — {r.turma}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Anônimo · Emitido em {hoje}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard title="Avaliações na turma" value={r.total} />
        <StatCard title="Professores avaliados" value={r.professores.length} />
      </div>

      <Table>
        <THead>
          <TH>Professor</TH>
          <TH className="text-center">Média</TH>
          <TH className="text-center">Avaliações</TH>
          <TH></TH>
        </THead>
        <TBody>
          {r.professores.map((p) => (
            <TR key={p.id}>
              <TD className="font-medium">{p.nome}</TD>
              <TD className="text-center">{p.media != null ? `★ ${p.media}` : "—"}</TD>
              <TD className="text-center">{p.total}</TD>
              <TD className="text-center no-print">
                <Link href={`/admin/relatorios/feedback/professor/${p.id}`} className="text-sm text-primary hover:underline">
                  Ver detalhes
                </Link>
              </TD>
            </TR>
          ))}
          {r.professores.length === 0 && (
            <TR>
              <TD className="text-muted-foreground">Sem avaliações nesta turma ainda.</TD>
            </TR>
          )}
        </TBody>
      </Table>
    </div>
  );
}

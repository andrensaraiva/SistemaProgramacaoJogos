import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireCapability } from "@/lib/auth/guard";
import { getProfessorFeedback } from "@/lib/reports/feedback";

import { PRINT_CSS } from "../../../_print";

export default async function FeedbackProfessor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireCapability("ver_relatorios");

  const r = await getProfessorFeedback(id);
  if (!r) notFound();
  const hoje = new Date().toLocaleDateString("pt-BR");

  return (
    <div className="relatorio-page flex flex-col gap-6">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <Link href="/admin/relatorios/feedback" className="text-sm text-muted-foreground hover:text-foreground">
          ← Feedback
        </Link>
        <div className="flex gap-2">
          <a href={`/admin/relatorios/feedback/professor/${id}/export`}>
            <Button variant="secondary">Exportar CSV</Button>
          </a>
          <PrintButton />
        </div>
      </div>

      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold">Feedback — {r.nome}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todas as turmas · Anônimo · Emitido em {hoje}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Média geral" value={r.resumo.average != null ? `★ ${r.resumo.average}` : "—"} tone="primary" />
        <StatCard title="Avaliações" value={r.resumo.total} />
        <StatCard title="Geral / por aula" value={`${r.resumo.geralCount} / ${r.resumo.porAulaCount}`} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Por turma</h2>
        <Table>
          <THead>
            <TH>Turma</TH>
            <TH className="text-center">Média</TH>
            <TH className="text-center">Avaliações</TH>
          </THead>
          <TBody>
            {r.porTurma.map((t, i) => (
              <TR key={i}>
                <TD className="font-medium">{t.turma}</TD>
                <TD className="text-center">{t.media != null ? `★ ${t.media}` : "—"}</TD>
                <TD className="text-center">{t.total}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Comentários (anônimos)</h2>
        {r.resumo.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem comentários.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {r.resumo.comments.map((c, i) => (
              <li key={i} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <span className="text-warning">{"★".repeat(c.rating)}</span> {c.comment}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

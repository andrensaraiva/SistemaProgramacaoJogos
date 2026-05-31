import { notFound, redirect } from "next/navigation";

import { BarChart, Donut } from "@/components/ui/charts";
import {
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui/table";
import { getProfile } from "@/lib/auth/dal";
import { getUcStats } from "@/lib/dashboard/uc-stats";
import { createClient } from "@/lib/supabase/server";

import { PrintButton } from "./_print-button";

// CSS de impressão: esconde a navegação e o que tiver .no-print, garante cores.
const PRINT_CSS = `
@media print {
  header, nav, .no-print { display: none !important; }
  body { background: #fff !important; }
  main { max-width: none !important; padding: 0 !important; }
  .relatorio-page { padding: 0; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

export default async function RelatorioUcPage({
  params,
}: {
  params: Promise<{ id: string; classUnitId: string }>;
}) {
  const { id, classUnitId } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const supabase = await createClient();
  const { data: cu } = await supabase
    .from("class_units")
    .select("id, class:classes!class_id(owner_id)")
    .eq("id", classUnitId)
    .single();
  const owner = (cu?.class as unknown as { owner_id: string } | undefined)?.owner_id;
  if (!cu) notFound();
  if (owner !== profile.id) redirect(`/turmas/${id}`);

  const stats = await getUcStats(classUnitId);
  if (!stats) notFound();

  const hoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="relatorio-page flex flex-col gap-6">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="flex items-center justify-between no-print">
        <span className="text-sm text-muted-foreground">
          Pré-visualização do relatório — use o botão para salvar em PDF.
        </span>
        <PrintButton />
      </div>

      {/* Cabeçalho do relatório */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold">Relatório de desempenho — {stats.uc?.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Turma {stats.turma.name}
          {stats.classUnit.serie ? ` · ${stats.classUnit.serie}` : ""}
          {stats.uc?.carga_horaria_h ? ` · ${stats.uc.carga_horaria_h}h` : ""} ·
          Professor: {profile.display_name} · Emitido em {hoje}
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-4 gap-3 text-center">
        <Resumo label="Alunos" value={String(stats.totalAlunos)} />
        <Resumo label="Aulas" value={String(stats.totalAulas)} />
        <Resumo
          label="Frequência média"
          value={stats.freqMediaPct != null ? `${stats.freqMediaPct}%` : "—"}
        />
        <Resumo label="Média de notas" value={stats.mediaGeral != null ? String(stats.mediaGeral) : "—"} />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold">Frequência</h2>
          <Donut
            centerLabel={stats.freqMediaPct != null ? `${stats.freqMediaPct}%` : "—"}
            segments={[
              { label: "Presenças", value: stats.freq.presencas, tone: "success" },
              { label: "Atrasos", value: stats.freq.atrasos, tone: "warning" },
              { label: "Faltas", value: stats.freq.faltas, tone: "danger" },
            ]}
          />
        </div>
        <div className="rounded-xl border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold">Notas por aluno</h2>
          {stats.alunos.some((a) => a.mediaNota != null) ? (
            <BarChart
              items={stats.alunos
                .filter((a) => a.mediaNota != null)
                .map((a) => ({
                  label: a.name,
                  value: a.mediaNota as number,
                  tone: (a.mediaNota as number) >= 6 ? "success" : "danger",
                }))}
              max={10}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Sem notas atribuídas.</p>
          )}
        </div>
      </div>

      {/* Tabela detalhada */}
      <Table>
        <THead>
          <TH>Aluno</TH>
          <TH className="text-center">Presenças</TH>
          <TH className="text-center">Atrasos</TH>
          <TH className="text-center">Faltas</TH>
          <TH className="text-center">Frequência</TH>
          <TH className="text-center">Média</TH>
          <TH className="text-center">Entregas</TH>
        </THead>
        <TBody>
          {stats.alunos.map((a) => (
            <TR key={a.id}>
              <TD className="font-medium">{a.name}</TD>
              <TD className="text-center">{a.presencas}</TD>
              <TD className="text-center">{a.atrasos}</TD>
              <TD className="text-center">{a.faltas}</TD>
              <TD className="text-center">
                {a.presencaPct != null ? `${a.presencaPct}%` : "—"}
              </TD>
              <TD className="text-center">{a.mediaNota ?? "—"}</TD>
              <TD className="text-center">{a.entregues}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

function Resumo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

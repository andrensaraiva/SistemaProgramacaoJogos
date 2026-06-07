import Link from "next/link";

import { PrintButton } from "@/components/print-button";
import { Donut } from "@/components/ui/charts";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { requireCapability } from "@/lib/auth/guard";
import { getInstitutionalReport } from "@/lib/reports/institutional";
import { getInstitutionSettings } from "@/lib/reports/settings";

import { PRINT_CSS } from "../_print";

export default async function RelatorioInstitucional() {
  await requireCapability("ver_relatorios");

  const [inst, settings] = await Promise.all([
    getInstitutionalReport(),
    getInstitutionSettings(),
  ]);

  const hoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="relatorio-page flex flex-col gap-6">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <Link href="/admin/relatorios" className="text-sm text-muted-foreground hover:text-foreground">
          ← Relatórios
        </Link>
        <div className="flex gap-2">
          <a href="/admin/relatorios/institucional/export">
            <Button variant="secondary">Exportar CSV</Button>
          </a>
          <PrintButton />
        </div>
      </div>

      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold">Relatório institucional</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {settings.institutionName} · Emitido em {hoje} · Critério: aprovação ≥{" "}
          {settings.thresholds.aprovacao.toFixed(1)}, frequência ≥ {settings.thresholds.freqMinPct}%
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Professores" value={inst.totais.professores} tone="primary" />
        <StatCard title="Alunos" value={inst.totais.alunos} />
        <StatCard title="Turmas" value={inst.totais.turmas} />
        <StatCard title="Cursos" value={inst.totais.cursos} />
        <StatCard title="Turmas × UC" value={inst.totais.classUnits} />
        <StatCard title="Frequência média" value={inst.freqMediaGlobalPct != null ? `${inst.freqMediaGlobalPct}%` : "—"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <h2 className="mb-3 text-sm font-semibold">Situação dos alunos (aluno × UC)</h2>
          {inst.situacao.total > 0 ? (
            <Donut
              centerLabel={String(inst.situacao.total)}
              segments={[
                { label: "Aprovados", value: inst.situacao.aprovado, tone: "success" },
                { label: "Recuperação", value: inst.situacao.recuperacao, tone: "warning" },
                { label: "Reprovados", value: inst.situacao.reprovado, tone: "danger" },
                { label: "Sem nota", value: inst.situacao.semNota, tone: "muted" },
              ]}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Sem matrículas com dados ainda.</p>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <StatCard title="Aprovados" value={inst.situacao.aprovado} tone="success" />
          <StatCard title="Em recuperação" value={inst.situacao.recuperacao} tone="warning" />
          <StatCard title="Reprovados" value={inst.situacao.reprovado} tone="danger" />
          <StatCard title="Frequência baixa" value={inst.alunosFreqBaixa} tone={inst.alunosFreqBaixa ? "warning" : "default"} hint={`< ${settings.thresholds.freqMinPct}% de presença`} />
        </div>
      </div>
    </div>
  );
}

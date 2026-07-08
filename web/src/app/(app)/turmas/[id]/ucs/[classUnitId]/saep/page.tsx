import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { BarChart, type BarItem } from "@/components/ui/charts";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/states";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getSaepDashboard, type TagStat } from "@/lib/saep/dashboard";
import { performanceBand } from "@/lib/dashboard/bands";

// Dashboard SAEP da UC: desempenho por competência e por objeto de conhecimento
// (o que reforçar), além da visão por aluno. Só o dono da turma acessa.
type Params = Promise<{ id: string; classUnitId: string }>;

// Faixa de cor por % (pura, testada em lib/dashboard/bands).
function toBars(stats: TagStat[]): BarItem[] {
  return stats.map((s) => ({
    label: s.label,
    value: s.pct ?? 0,
    tone: performanceBand(s.pct),
  }));
}

export default async function SaepDashboardPage({ params }: { params: Params }) {
  const { id, classUnitId } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  // Posse: só o dono da turma vê o dashboard.
  const supabase = await createClient();
  const { data: cu } = await supabase
    .from("class_units")
    .select("id, class_id, class:classes!class_id(owner_id)")
    .eq("id", classUnitId)
    .single();
  if (!cu || cu.class_id !== id) notFound();
  const owner = (cu.class as unknown as { owner_id: string } | undefined)?.owner_id;
  if (owner !== profile.id) redirect(`/turmas/${id}`);

  const stats = await getSaepDashboard(classUnitId);
  if (!stats) notFound();

  const crumbs = [
    { label: "Turmas", href: "/turmas" },
    { label: stats.turma.name, href: `/turmas/${id}` },
    { label: "Unidades curriculares", href: `/turmas/${id}/ucs` },
    { label: stats.uc?.title ?? "UC", href: `/turmas/${id}/ucs/${classUnitId}/atividades` },
    { label: "Dashboard SAEP" },
  ];

  // Sem nenhuma avaliação (nem simulado teórico nem SAP prático).
  if (stats.totalSimulados === 0 && stats.totalSapAssessments === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={crumbs} />
        <PageHeader
          title="Dashboard SAEP/SAP"
          description={`${stats.uc?.title ?? "UC"} · Turma ${stats.turma.name}`}
        />
        <EmptyState
          title="Nenhuma avaliação nesta UC"
          description="Crie um simulado SAEP ou um SAP prático nas atividades da UC para começar a coletar desempenho por competência."
        />
      </div>
    );
  }

  // Há atividades, mas ainda sem dados (sem envios e sem avaliações fechadas).
  if (stats.overall.total === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={crumbs} />
        <PageHeader
          title="Dashboard SAEP/SAP"
          description={`${stats.uc?.title ?? "UC"} · Turma ${stats.turma.name}`}
        />
        <EmptyState
          title="Ainda sem dados"
          description={`${stats.totalSimulados} simulado(s) e ${stats.totalSapAssessments} SAP prático(s), mas nenhuma resposta enviada nem avaliação fechada ainda.`}
        />
      </div>
    );
  }

  // Competências mais fracas (para destacar o que reforçar).
  const fracas = [...stats.byCompetency]
    .filter((c) => c.pct != null)
    .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={crumbs} />
      <PageHeader
        title="Dashboard SAEP/SAP"
        description={`${stats.uc?.title ?? "UC"} · Turma ${stats.turma.name}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Acerto geral"
          value={stats.overall.pct != null ? `${stats.overall.pct}%` : "—"}
          tone={
            stats.overall.pct != null && stats.overall.pct < 60 ? "danger" : "success"
          }
          hint={`${stats.overall.correct}/${stats.overall.total} sinais (teórico + prático)`}
        />
        <StatCard
          title="Teórico (SAEP)"
          value={stats.totalSimulados}
          hint={`${stats.totalSubmittedAttempts} envio(s)`}
        />
        <StatCard
          title="Prático (SAP)"
          value={stats.totalSapAssessments}
          hint={`${stats.totalSapEvaluations} avaliação(ões)`}
        />
        <StatCard
          title="Alunos avaliados (teórico)"
          value={stats.students.filter((s) => s.answered > 0).length}
        />
      </div>

      {/* Pontos a reforçar */}
      {fracas.length > 0 && (
        <section className="rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <h2 className="text-sm font-semibold">Pontos a reforçar (menor acerto)</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {fracas.map((c) => (
              <span
                key={c.code}
                className="rounded-full bg-background px-3 py-1 text-xs font-medium"
              >
                {c.label} · <span className="text-danger">{c.pct}%</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Por competência (teórico + prático combinados) */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Acerto por competência</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Combina respostas do SAEP teórico e itens &quot;Sim&quot; do SAP prático.
        </p>
        {stats.byCompetency.length ? (
          <BarChart items={toBars(stats.byCompetency)} unit="%" max={100} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Os itens avaliados não estão classificados por competência.
          </p>
        )}
      </section>

      {/* Por objeto de conhecimento (teórico + prático combinados) */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Acerto por objeto de conhecimento</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Combina respostas do SAEP teórico e itens &quot;Sim&quot; do SAP prático.
        </p>
        {stats.byKnowledgeObject.length ? (
          <BarChart items={toBars(stats.byKnowledgeObject)} unit="%" max={100} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Os itens avaliados não estão classificados por objeto de conhecimento.
          </p>
        )}
      </section>

      {/* Por aluno (somente teórico) */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Desempenho por aluno (teórico)</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Acerto nos simulados SAEP. A nota do SAP prático fica na própria atividade.
        </p>
        <Table>
          <THead>
            <TH>Aluno</TH>
            <TH className="text-center">Envios</TH>
            <TH className="text-center">Respondidas</TH>
            <TH className="text-center">Acerto</TH>
          </THead>
          <TBody>
            {stats.students.map((s) => (
              <TR key={s.id}>
                <TD className="font-medium">{s.name}</TD>
                <TD className="text-center tnum text-muted-foreground">{s.attempts}</TD>
                <TD className="text-center tnum text-muted-foreground">{s.answered}</TD>
                <TD className="text-center tnum">
                  {s.pct != null ? (
                    <span
                      className={`font-semibold ${
                        s.pct < 50 ? "text-danger" : s.pct < 70 ? "text-warning" : "text-success"
                      }`}
                    >
                      {s.pct}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </section>
    </div>
  );
}

import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { BarChart, type BarItem } from "@/components/ui/charts";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/states";
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

  // Sem simulados ainda.
  if (stats.totalSimulados === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={crumbs} />
        <PageHeader
          title="Dashboard SAEP"
          description={`${stats.uc?.title ?? "UC"} · Turma ${stats.turma.name}`}
        />
        <EmptyState
          title="Nenhum simulado nesta UC"
          description="Crie um simulado SAEP nas atividades da UC para começar a coletar desempenho por competência."
        />
      </div>
    );
  }

  // Sem respostas enviadas ainda.
  if (stats.overall.total === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={crumbs} />
        <PageHeader
          title="Dashboard SAEP"
          description={`${stats.uc?.title ?? "UC"} · Turma ${stats.turma.name}`}
        />
        <EmptyState
          title="Ainda sem envios"
          description={`${stats.totalSimulados} simulado(s) criado(s), mas nenhum aluno enviou respostas ainda.`}
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
        title="Dashboard SAEP"
        description={`${stats.uc?.title ?? "UC"} · Turma ${stats.turma.name}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Acerto geral"
          value={stats.overall.pct != null ? `${stats.overall.pct}%` : "—"}
          tone={
            stats.overall.pct != null && stats.overall.pct < 60 ? "danger" : "success"
          }
          hint={`${stats.overall.correct}/${stats.overall.total} respostas`}
        />
        <StatCard title="Simulados" value={stats.totalSimulados} />
        <StatCard title="Envios" value={stats.totalSubmittedAttempts} />
        <StatCard
          title="Alunos avaliados"
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

      {/* Por competência */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Acerto por competência</h2>
        {stats.byCompetency.length ? (
          <BarChart items={toBars(stats.byCompetency)} unit="%" max={100} />
        ) : (
          <p className="text-sm text-muted-foreground">
            As questões respondidas não estão classificadas por competência.
          </p>
        )}
      </section>

      {/* Por objeto de conhecimento */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Acerto por objeto de conhecimento</h2>
        {stats.byKnowledgeObject.length ? (
          <BarChart items={toBars(stats.byKnowledgeObject)} unit="%" max={100} />
        ) : (
          <p className="text-sm text-muted-foreground">
            As questões respondidas não estão classificadas por objeto de conhecimento.
          </p>
        )}
      </section>

      {/* Por aluno */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Desempenho por aluno</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 text-left font-medium">Aluno</th>
                <th className="px-3 py-2 text-center font-medium">Envios</th>
                <th className="px-3 py-2 text-center font-medium">Respondidas</th>
                <th className="px-3 py-2 text-center font-medium">Acerto</th>
              </tr>
            </thead>
            <tbody>
              {stats.students.map((s, i) => (
                <tr key={s.id} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{s.attempts}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{s.answered}</td>
                  <td className="px-3 py-2 text-center">
                    {s.pct != null ? (
                      <span
                        className={
                          s.pct < 50
                            ? "font-semibold text-danger"
                            : s.pct < 70
                              ? "font-semibold text-warning"
                              : "font-semibold text-success"
                        }
                      >
                        {s.pct}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarChart, Donut } from "@/components/ui/charts";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
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

export default async function DashboardUcPage({
  params,
}: {
  params: Promise<{ id: string; classUnitId: string }>;
}) {
  const { id, classUnitId } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  // Posse: só o dono da turma vê o dashboard.
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

  const freqAbaixo = stats.alunos.filter(
    (a) => a.presencaPct != null && a.presencaPct < 75,
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Turmas", href: "/turmas" },
          { label: stats.turma.name, href: `/turmas/${id}` },
          { label: "Unidades curriculares", href: `/turmas/${id}/ucs` },
          { label: "Dashboard" },
        ]}
      />
      <PageHeader
        title="Dashboard da UC"
        description={`${stats.uc?.title ?? "Unidade curricular"} · Turma ${stats.turma.name}`}
        actions={
          <Link href={`/turmas/${id}/ucs/${classUnitId}/dashboard/relatorio`}>
            <Button variant="secondary">Gerar relatório (PDF)</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Alunos" value={stats.totalAlunos} />
        <StatCard
          title="Frequência média"
          value={stats.freqMediaPct != null ? `${stats.freqMediaPct}%` : "—"}
          tone={
            stats.freqMediaPct != null && stats.freqMediaPct < 75 ? "danger" : "success"
          }
          hint={`${stats.totalAulas} aulas registradas`}
        />
        <StatCard
          title="Média de notas"
          value={stats.mediaGeral != null ? stats.mediaGeral : "—"}
          tone="primary"
        />
        <StatCard
          title="Abaixo de 75%"
          value={freqAbaixo}
          tone={freqAbaixo > 0 ? "warning" : "default"}
          hint="alunos em risco de frequência"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Distribuição de frequência
          </h2>
          <Donut
            centerLabel={stats.freqMediaPct != null ? `${stats.freqMediaPct}%` : "—"}
            segments={[
              { label: "Presenças", value: stats.freq.presencas, tone: "success" },
              { label: "Atrasos", value: stats.freq.atrasos, tone: "warning" },
              { label: "Faltas", value: stats.freq.faltas, tone: "danger" },
            ]}
          />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Notas por aluno
          </h2>
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
            <p className="text-sm text-muted-foreground">Sem notas atribuídas ainda.</p>
          )}
        </Card>
      </div>

      <Card padding="p-0">
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
                  {a.presencaPct != null ? (
                    <StatusBadge
                      label={`${a.presencaPct}%`}
                      tone={a.presencaPct < 75 ? "danger" : "success"}
                    />
                  ) : (
                    "—"
                  )}
                </TD>
                <TD className="text-center">{a.mediaNota ?? "—"}</TD>
                <TD className="text-center">{a.entregues}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

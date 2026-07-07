import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireCapability } from "@/lib/auth/guard";
import { getCoordinatorDashboard } from "@/lib/dashboard/coordinator";

const SIT_LABEL: Record<string, string> = {
  reprovado: "Reprovado",
  recuperacao: "Recuperação",
  aprovado: "Aprovado",
};

function SimNao({ ok }: { ok: boolean }) {
  return (
    <Badge tone={ok ? "success" : "warning"} dot>
      {ok ? "feito" : "pendente"}
    </Badge>
  );
}

// Ícones dos KPIs (herdam a cor do tom via StatCard).
const csv = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const CICON = {
  turma: csv("M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"),
  alunos: csv("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"),
  corrigir: csv("M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"),
  risco: csv("M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"),
};

export default async function CoordenadorPage() {
  await requireCapability("supervisionar_turmas");
  const dash = await getCoordinatorDashboard();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Coordenação"
        title="Supervisão das turmas"
        description="Operação dos professores, salas, alunos em risco e a percepção dos alunos por UC."
        actions={
          <>
            <Link href="/coordenador/pesquisas">
              <Button variant="secondary">📝 Pesquisas de UC</Button>
            </Link>
            <Link href="/turmas/nova">
              <Button>+ Nova turma</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Turmas" value={dash.turmasCount} tone="primary" icon={CICON.turma} />
        <StatCard title="Alunos" value={dash.alunosCount} icon={CICON.alunos} />
        <StatCard
          title="A corrigir"
          value={dash.aCorrigirCount}
          tone={dash.aCorrigirCount ? "warning" : "success"}
          hint="entregas aguardando nota"
          icon={CICON.corrigir}
        />
        <StatCard
          title="Em risco"
          value={dash.emRiscoCount}
          tone={dash.emRiscoCount ? "danger" : "success"}
          hint="recuperação ou reprovação"
          icon={CICON.risco}
        />
      </div>

      {/* Professores a acompanhar */}
      <Card>
        <CardHeader
          title="Operação dos professores"
          description="Quem está sem plano, com execução baixa ou sem frequência lançada — acompanhe."
        />
        {dash.professores.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum professor com turma no momento.</p>
        ) : (
          <Table>
            <THead>
              <TH>Professor</TH>
              <TH className="text-center">Turmas</TH>
              <TH className="text-center">UCs sem plano</TH>
              <TH className="text-center">Execução</TH>
              <TH className="text-center">Frequência</TH>
            </THead>
            <TBody>
              {dash.professores.map((p) => (
                <TR key={p.id}>
                  <TD className="font-medium">{p.nome}</TD>
                  <TD className="text-center tnum">{p.turmas}</TD>
                  <TD className={`text-center tnum ${p.semPlano > 0 ? "font-medium text-warning" : "text-muted-foreground"}`}>
                    {p.semPlano}
                  </TD>
                  <TD className="text-center tnum text-muted-foreground">
                    {p.execucaoPct != null ? `${p.execucaoPct}%` : "—"}
                  </TD>
                  <TD className="text-center">
                    {p.semFrequencia ? (
                      <Badge tone="danger" dot>sem registro</Badge>
                    ) : (
                      <Badge tone="success" dot>ok</Badge>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Checklist diário dos professores (chamada + plano) */}
      <Card>
        <CardHeader
          title="Rotina de hoje dos professores"
          description="Quem já fez a chamada e registrou o plano de aula hoje."
        />
        {dash.checklistHoje.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum professor com turma no momento.</p>
        ) : (
          <Table>
            <THead>
              <TH>Professor</TH>
              <TH className="text-center">Chamada</TH>
              <TH className="text-center">Plano de aula</TH>
            </THead>
            <TBody>
              {dash.checklistHoje.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium">{c.nome}</TD>
                  <TD className="text-center"><SimNao ok={c.presencaFeita} /></TD>
                  <TD className="text-center"><SimNao ok={c.planoRegistrado} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Uso de salas */}
      <Card>
        <CardHeader
          title="Uso de salas"
          description="Alocação nos próximos 30 dias — conflitos e aulas sem sala definida."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Conflitos de sala"
            value={dash.usoSalas.totalConflitos}
            tone={dash.usoSalas.totalConflitos ? "danger" : "success"}
            hint="mesma sala, mesma data, 2+ turmas"
          />
          <StatCard
            title="Aulas sem sala"
            value={dash.usoSalas.aulasSemSala}
            tone={dash.usoSalas.aulasSemSala ? "warning" : "success"}
            hint="dias letivos sem sala definida"
          />
        </div>
        <div className="mt-3">
          <Link href="/salas/ocupacao" className="text-sm text-primary hover:underline">
            Ver ocupação detalhada →
          </Link>
        </div>
      </Card>

      {/* Alunos em risco */}
      <Card tone={dash.emRisco.length > 0 ? "danger" : undefined}>
        <CardHeader
          title="Alunos em risco"
          description="Recuperação ou reprovação por UC — aja para evitar evasão."
          action={dash.emRisco.length > 0 ? <Badge tone="danger" dot>{dash.emRiscoCount}</Badge> : undefined}
        />
        {dash.emRisco.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
            <span className="text-xl">🎉</span> Nenhum aluno em risco no momento.
          </div>
        ) : (
          <Table>
            <THead>
              <TH>Aluno</TH>
              <TH>Turma</TH>
              <TH>UC</TH>
              <TH className="text-center">Média</TH>
              <TH className="text-center">Freq.</TH>
              <TH className="text-center">Situação</TH>
            </THead>
            <TBody>
              {dash.emRisco.map((r, i) => (
                <TR key={`${r.aluno}-${i}`}>
                  <TD className="font-medium">{r.aluno}</TD>
                  <TD className="text-muted-foreground">{r.turma}</TD>
                  <TD className="text-muted-foreground">{r.uc}</TD>
                  <TD className="text-center tnum">{r.media != null ? r.media.toFixed(1) : "—"}</TD>
                  <TD className={`text-center tnum ${r.freqPct != null && r.freqPct < 75 ? "font-medium text-danger" : ""}`}>
                    {r.freqPct != null ? `${r.freqPct}%` : "—"}
                  </TD>
                  <TD className="text-center">
                    <Badge tone={r.situacao === "reprovado" ? "danger" : "warning"} dot>
                      {SIT_LABEL[r.situacao] ?? r.situacao}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Turmas com atalhos de gestão */}
      <Card>
        <CardHeader title="Turmas" description={`${dash.turmasCount} turma(s). Entre para gerenciar.`} />
        {dash.turmas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma turma cadastrada.</p>
        ) : (
          <ul className="divide-y divide-border">
            {dash.turmas.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{t.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.alunos} aluno(s)
                    {t.dono ? ` · responsável: ${t.dono}` : ""}
                    {t.emRisco > 0 ? <span className="text-warning"> · {t.emRisco} em risco</span> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Link href={`/turmas/${t.id}`} className="rounded-lg border border-border px-2.5 py-1 hover:bg-muted">
                    Abrir
                  </Link>
                  <Link href={`/turmas/${t.id}/alunos`} className="rounded-lg border border-border px-2.5 py-1 hover:bg-muted">
                    Alunos
                  </Link>
                  <Link href={`/turmas/${t.id}/calendario`} className="rounded-lg border border-border px-2.5 py-1 hover:bg-muted">
                    Calendário
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

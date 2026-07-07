import Link from "next/link";

import { UpcomingDeadlines, type DeadlineItem } from "@/components/upcoming-deadlines";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { TeacherDashboard } from "@/lib/dashboard/teacher";
import type { FeedbackSummary } from "@/lib/feedback/aggregate";
import type { ChecklistDia } from "@/lib/teacher/checklist";

import { ChecklistDiario } from "./_checklist";

const SIT_LABEL: Record<string, string> = {
  reprovado: "Reprovado",
  recuperacao: "Recuperação",
  aprovado: "Aprovado",
};

const MARKER_META: Record<string, { label: string; emoji: string }> = {
  feriado: { label: "Feriado", emoji: "🎉" },
  recesso: { label: "Recesso", emoji: "🌴" },
  ferias: { label: "Férias", emoji: "🏖️" },
  capacitacao: { label: "Capacitação", emoji: "🎓" },
  conselho: { label: "Conselho de classe", emoji: "🧑‍🏫" },
  evento: { label: "Evento", emoji: "📌" },
};

function markerMeta(marker: string) {
  return MARKER_META[marker] ?? { label: marker, emoji: "📅" };
}

/** Data de hoje por extenso, ex.: "Segunda, 30 de junho". */
function hojeFormatado(): string {
  const s = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Ícones dos KPIs (18px, stroke currentColor). Herdam a cor do tom via StatCard.
const sv = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICON = {
  turma: sv("M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"),
  alunos: sv("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"),
  corrigir: sv("M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"),
  risco: sv("M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"),
};

function dataCurta(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function diasAte(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function tempoRelativo(iso: string): string {
  const dias = diasDesde(iso);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}

function estrelas(n: number): string {
  const r = Math.round(n);
  return "★".repeat(r) + "☆".repeat(5 - r);
}

export function PainelProfessor({
  nome,
  dash,
  deadlines,
  feedback,
  checklist,
}: {
  nome: string;
  dash: TeacherDashboard;
  deadlines: DeadlineItem[];
  feedback: FeedbackSummary;
  checklist: ChecklistDia;
}) {
  // Professor sem turmas: onboarding direto.
  if (dash.turmasCount === 0) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={`Olá, ${nome}!`} description="Comece criando sua primeira turma." />
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold">Crie sua primeira turma</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Organize alunos em turmas, monte o calendário e atribua listas de exercícios.
          </p>
          <div className="mt-4">
            <Link href="/turmas/nova">
              <Button>+ Nova turma</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={hojeFormatado()}
        title={`Olá, ${nome.split(" ")[0]} 👋`}
        description="Seu dia de ensino: o que corrigir, as aulas de hoje e quem precisa de atenção."
      />

      {/* Métricas do professor (sem XP/nível/conquistas). Ícones + tom por estado. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Turmas" value={dash.turmasCount} tone="primary" icon={ICON.turma} />
        <StatCard title="Alunos" value={dash.alunosCount} icon={ICON.alunos} />
        <StatCard
          title="A corrigir"
          value={dash.aCorrigirCount}
          tone={dash.aCorrigirCount ? "warning" : "success"}
          hint={dash.aCorrigirCount ? "entregas aguardando nota" : "tudo corrigido"}
          icon={ICON.corrigir}
        />
        <StatCard
          title="Em risco"
          value={dash.emRiscoCount}
          tone={dash.emRiscoCount ? "danger" : "success"}
          hint={dash.emRiscoCount ? "recuperação ou reprovação" : "ninguém em risco"}
          icon={ICON.risco}
        />
      </div>

      {/* Checklist diário: chamada + plano de aula */}
      <ChecklistDiario checklist={checklist} temAulaHoje={dash.aulasHoje.length > 0} />

      {/* Próximos eventos do calendário (feriado, conselho, etc.) */}
      {dash.eventosProximos.length > 0 && (
        <Card>
          <CardHeader title="📅 Próximos eventos" description="Marcadores do calendário das suas turmas (14 dias)." />
          <div className="flex flex-wrap gap-2">
            {dash.eventosProximos.map((e, i) => {
              const meta = markerMeta(e.marker);
              const dias = diasAte(e.date);
              return (
                <div
                  key={`${e.date}-${i}`}
                  className="flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1.5 text-sm"
                  title={e.note ?? undefined}
                >
                  <span>{meta.emoji}</span>
                  <span className="font-medium">{meta.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {dataCurta(e.date)} · {e.turma}
                    {dias <= 2 && dias >= 0 ? (dias === 0 ? " · hoje" : dias === 1 ? " · amanhã" : ` · em ${dias}d`) : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* A corrigir — cada entrega é uma ação; itens antigos ganham stripe */}
        <Card>
          <CardHeader
            title="A corrigir"
            description="Entregas aguardando sua nota."
            action={
              dash.aCorrigir.length > 0 ? (
                <Badge tone="warning" dot>
                  {dash.aCorrigirCount}
                </Badge>
              ) : undefined
            }
          />
          {dash.aCorrigir.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
              <span className="text-xl">✅</span> Nada pendente de correção. Bom trabalho!
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {dash.aCorrigir.map((c) => {
                const urgente = diasDesde(c.enviadaEm) >= 3;
                return (
                  <li key={c.submissionId}>
                    <Link
                      href={c.href}
                      className={`group flex items-center gap-3 rounded-xl border p-2.5 transition-all hover:-translate-y-0.5 hover:shadow-e2 ${
                        urgente ? "stripe-l stripe-danger border-danger/25 bg-danger/5" : "border-border bg-background/40 hover:border-primary/40"
                      }`}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                        {c.aluno.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium group-hover:text-primary">{c.aluno}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {c.exercicio} · {c.turma}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          urgente ? "bg-danger/15 text-danger" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {tempoRelativo(c.enviadaEm)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Aula(s) de hoje */}
        <Card>
          <CardHeader title="Aulas de hoje" description="Conforme o calendário das suas turmas." />
          {dash.aulasHoje.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma aula programada para hoje no calendário.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {dash.aulasHoje.map((a, i) => (
                <li key={`${a.turmaId}-${i}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <Link href={`/turmas/${a.turmaId}`} className="font-medium hover:text-primary">
                      {a.turma}
                    </Link>
                    <span className="block truncate text-xs text-muted-foreground">
                      {a.uc ?? "Sem UC definida"}
                    </span>
                  </span>
                  {a.sala && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      📍 {a.sala}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Entregas com faltantes (prazo vencido) */}
      {dash.entregasFaltantes.length > 0 && (
        <Card>
          <CardHeader
            title="⏳ Faltam entregar"
            description="Atividades com prazo vencido e quantos alunos ainda não entregaram."
          />
          <ul className="flex flex-col gap-2">
            {dash.entregasFaltantes.map((e) => (
              <li key={e.listaId}>
                <Link
                  href={`/turmas/${e.turmaId}/listas/${e.listaId}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/40 p-3 text-sm transition-colors hover:border-primary/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{e.lista}</span>
                    <span className="text-xs text-muted-foreground">
                      {e.turma} · venceu {dataCurta(e.dueAt)}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-danger/15 px-2.5 py-1 text-xs font-semibold text-danger">
                    {e.faltantes} de {e.total} não entregaram
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Alunos em risco */}
      {dash.emRisco.length > 0 && (
        <Card tone="danger">
          <CardHeader
            title="Alunos em risco"
            description="Recuperação ou reprovação nas suas turmas — vale acompanhar."
            action={<Badge tone="danger" dot>{dash.emRiscoCount}</Badge>}
          />
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
        </Card>
      )}

      {/* Últimos feedbacks dos alunos (anônimos) */}
      <Card>
        <CardHeader
          title="Feedback dos alunos"
          description="Anônimo — você não vê quem enviou. Os comentários mais recentes primeiro."
        />
        {feedback.total === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não há feedback dos alunos.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-warning text-lg">{estrelas(feedback.average ?? 0)}</span>
              <span className="font-medium">
                {feedback.average != null ? feedback.average.toFixed(1) : "—"} / 5
              </span>
              <span className="text-muted-foreground">
                {feedback.total} avaliação(ões) · {feedback.geralCount} gerais · {feedback.porAulaCount} por aula
              </span>
            </div>
            {feedback.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem comentários escritos por enquanto.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {feedback.comments.slice(0, 5).map((c, i) => (
                  <li key={i} className="rounded-lg border border-border bg-background/40 p-3 text-sm">
                    <span className="text-warning">{estrelas(c.rating)}</span>
                    {c.sessionId && (
                      <span className="ml-2 text-xs text-muted-foreground">sobre uma aula</span>
                    )}
                    <p className="mt-1 text-foreground">{c.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>

      {/* Próximas entregas (já existente) + atalhos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingDeadlines items={deadlines} />
        <Card>
          <CardHeader title="Atalhos" description="Ações rápidas do dia a dia." />
          <div className="flex flex-wrap gap-2">
            <Link href="/turmas">
              <Button variant="secondary">Minhas turmas</Button>
            </Link>
            <Link href="/exercicios/novo">
              <Button variant="secondary">+ Nova atividade</Button>
            </Link>
            <Link href="/exercicios/gerar">
              <Button variant="secondary">✨ Gerar com IA</Button>
            </Link>
            <Link href="/cursos">
              <Button variant="secondary">Cursos</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

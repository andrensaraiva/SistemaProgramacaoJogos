import Link from "next/link";

import { UpcomingDeadlines, type DeadlineItem } from "@/components/upcoming-deadlines";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
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

function dataCurta(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function diasAte(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function tempoRelativo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const dias = Math.floor(diffMs / 86_400_000);
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
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Olá, ${nome}!`}
        description="Seu dia de ensino: o que corrigir, as aulas de hoje e quem precisa de atenção."
      />

      {/* Métricas do professor (sem XP/nível/conquistas) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Turmas" value={dash.turmasCount} tone="primary" />
        <StatCard title="Alunos" value={dash.alunosCount} />
        <StatCard
          title="A corrigir"
          value={dash.aCorrigirCount}
          tone={dash.aCorrigirCount ? "warning" : "default"}
          hint="entregas aguardando nota"
        />
        <StatCard
          title="Em risco"
          value={dash.emRiscoCount}
          tone={dash.emRiscoCount ? "danger" : "default"}
          hint="recuperação ou reprovação"
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
        {/* A corrigir */}
        <Card>
          <CardHeader
            title="A corrigir"
            description="Entregas aguardando sua nota. Clique para corrigir."
          />
          {dash.aCorrigir.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada pendente de correção. 🎉</p>
          ) : (
            <ul className="divide-y divide-border">
              {dash.aCorrigir.map((c) => (
                <li key={c.submissionId}>
                  <Link
                    href={c.href}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-primary"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{c.aluno}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {c.exercicio} · {c.turma} · {c.lista}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {tempoRelativo(c.enviadaEm)}
                    </span>
                  </Link>
                </li>
              ))}
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
        <Card>
          <CardHeader
            title="Alunos em risco"
            description="Recuperação ou reprovação nas suas turmas — vale acompanhar."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1">Aluno</th>
                  <th>Turma</th>
                  <th>UC</th>
                  <th className="text-center">Média</th>
                  <th className="text-center">Freq.</th>
                  <th className="text-center">Situação</th>
                </tr>
              </thead>
              <tbody>
                {dash.emRisco.map((r, i) => (
                  <tr key={`${r.aluno}-${i}`} className="border-t border-border">
                    <td className="py-1.5">{r.aluno}</td>
                    <td>{r.turma}</td>
                    <td>{r.uc}</td>
                    <td className="text-center">{r.media != null ? r.media.toFixed(1) : "—"}</td>
                    <td className={`text-center ${r.freqPct != null && r.freqPct < 75 ? "text-danger font-medium" : ""}`}>
                      {r.freqPct != null ? `${r.freqPct}%` : "—"}
                    </td>
                    <td className="text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          r.situacao === "reprovado" ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning"
                        }`}
                      >
                        {SIT_LABEL[r.situacao] ?? r.situacao}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

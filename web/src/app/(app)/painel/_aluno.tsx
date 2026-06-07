import Link from "next/link";

import { StudentOnboardingTour } from "@/components/student-onboarding-tour";
import { UpcomingDeadlines, type DeadlineItem } from "@/components/upcoming-deadlines";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import type { StudentDashboard } from "@/lib/dashboard/student";

const SIT_LABEL: Record<string, string> = {
  reprovado: "Reprovado",
  recuperacao: "Recuperação",
  aprovado: "Aprovado",
};

function prazoRelativo(iso: string | null): string {
  if (!iso) return "";
  const dias = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "amanhã";
  return `em ${dias} dias`;
}

export function PainelAluno({
  nome,
  dash,
  deadlines,
}: {
  nome: string;
  dash: StudentDashboard;
  deadlines: DeadlineItem[];
}) {
  const { nivel } = dash;

  // Sem turma ainda: onboarding.
  if (dash.turmas.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <StudentOnboardingTour />
        <PageHeader title={`Olá, ${nome}!`} description="Entre numa turma para começar." />
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold">Entre em uma turma</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Peça o código de convite ao seu professor para começar.
          </p>
          <div className="mt-4">
            <Link href="/turmas/entrar">
              <Button>Entrar com código</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <StudentOnboardingTour />

      <PageHeader
        title={`Olá, ${nome}!`}
        description={`Você está no nível ${nivel.level}. Faltam ${nivel.faltam} XP para o nível ${nivel.level + 1}.`}
      />

      {/* Stats + barra de progresso do nível */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Nível</div>
          <div className="text-3xl font-bold text-primary">{nivel.level}</div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${nivel.pct}%` }} />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {nivel.xpNoNivel}/100 XP · faltam {nivel.faltam}
          </div>
        </div>
        <StatCard title="XP total" value={nivel.level > 1 ? (nivel.level - 1) * 100 + nivel.xpNoNivel : nivel.xpNoNivel} hint="pontos de experiência" />
        <StatCard title="Conquistas" value={dash.conquistas} hint="continue resolvendo pra desbloquear" />
      </div>

      {/* Pendências em destaque */}
      <Card>
        <CardHeader title="A entregar" description="Atividades com prazo que você ainda não enviou." />
        {dash.pendencias.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tudo em dia! 🎉</p>
        ) : (
          <ul className="divide-y divide-border">
            {dash.pendencias.slice(0, 8).map((p) => (
              <li key={p.assignmentId}>
                <Link
                  href={`/turmas/${p.classId}/listas/${p.assignmentId}`}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-primary"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{p.titulo}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p.turma}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{prazoRelativo(p.dueAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Meu desempenho por UC */}
      <Card>
        <CardHeader
          title="Meu desempenho"
          description="Como você vai em cada unidade curricular. Clique para ver o detalhe."
        />
        {dash.desempenho.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não há notas ou frequência lançadas.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-success">
                {dash.resumo.aprovado} aprovado(s)
              </span>
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-warning">
                {dash.resumo.recuperacao} recuperação
              </span>
              <span className="rounded-full bg-danger/15 px-2 py-0.5 text-danger">
                {dash.resumo.reprovado} reprovado(s)
              </span>
              {dash.resumo.freqMedia != null && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  Frequência média {dash.resumo.freqMedia}%
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1">UC</th>
                    <th>Turma</th>
                    <th className="text-center">Média</th>
                    <th className="text-center">Freq.</th>
                    <th className="text-center">Situação</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {dash.desempenho.map((d, i) => (
                    <tr key={`${d.uc}-${i}`} className="border-t border-border">
                      <td className="py-1.5">{d.uc}</td>
                      <td>{d.turma}</td>
                      <td className="text-center">{d.media != null ? d.media.toFixed(1) : "—"}</td>
                      <td className={`text-center ${d.freqBaixa ? "text-danger font-medium" : ""}`}>
                        {d.freqPct != null ? `${d.freqPct}%` : "—"}
                      </td>
                      <td className="text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            d.situacao === "reprovado"
                              ? "bg-danger/15 text-danger"
                              : d.situacao === "recuperacao"
                                ? "bg-warning/15 text-warning"
                                : "bg-success/15 text-success"
                          }`}
                        >
                          {SIT_LABEL[d.situacao] ?? d.situacao}
                        </span>
                      </td>
                      <td className="text-right">
                        {d.classId && (
                          <Link
                            href={`/turmas/${d.classId}/minhas-notas`}
                            className="text-xs text-primary hover:underline"
                          >
                            detalhes
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* Próximas entregas + atalhos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingDeadlines items={deadlines} />
        <Card>
          <CardHeader title="Atalhos" description="Continue praticando." />
          <div className="flex flex-wrap gap-2">
            <Link href="/exercicios">
              <Button variant="secondary">Exercícios</Button>
            </Link>
            <Link href="/duelos">
              <Button variant="secondary">Duelos</Button>
            </Link>
            <Link href="/ranking">
              <Button variant="secondary">Ranking</Button>
            </Link>
            <Link href="/turmas">
              <Button variant="secondary">Minhas turmas</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

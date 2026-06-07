import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { requireCapability } from "@/lib/auth/guard";
import { getCoordinatorDashboard } from "@/lib/dashboard/coordinator";

const SIT_LABEL: Record<string, string> = {
  reprovado: "Reprovado",
  recuperacao: "Recuperação",
  aprovado: "Aprovado",
};

export default async function CoordenadorPage() {
  await requireCapability("supervisionar_turmas");
  const dash = await getCoordinatorDashboard();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Painel de coordenação"
        description="Supervisão das turmas: operação dos professores, alunos em risco e gestão."
        actions={
          <Link href="/turmas/nova">
            <Button>+ Nova turma</Button>
          </Link>
        }
      />

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

      {/* Professores a acompanhar */}
      <Card>
        <CardHeader
          title="Operação dos professores"
          description="Quem está sem plano, com execução baixa ou sem frequência lançada — acompanhe."
        />
        {dash.professores.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum professor com turma no momento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1">Professor</th>
                  <th className="text-center">Turmas</th>
                  <th className="text-center">UCs sem plano</th>
                  <th className="text-center">Execução</th>
                  <th className="text-center">Frequência</th>
                </tr>
              </thead>
              <tbody>
                {dash.professores.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-1.5">{p.nome}</td>
                    <td className="text-center">{p.turmas}</td>
                    <td className={`text-center ${p.semPlano > 0 ? "text-warning font-medium" : ""}`}>
                      {p.semPlano}
                    </td>
                    <td className="text-center">
                      {p.execucaoPct != null ? `${p.execucaoPct}%` : "—"}
                    </td>
                    <td className="text-center">
                      {p.semFrequencia ? (
                        <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs text-danger">
                          sem registro
                        </span>
                      ) : (
                        <span className="text-success">✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Alunos em risco */}
      <Card>
        <CardHeader
          title="Alunos em risco"
          description="Recuperação ou reprovação por UC — aja para evitar evasão."
        />
        {dash.emRisco.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aluno em risco no momento. 🎉</p>
        ) : (
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

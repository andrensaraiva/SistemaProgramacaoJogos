import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getProfile } from "@/lib/auth/dal";
import { getStudentDashboard } from "@/lib/dashboard/student";

const SIT_LABEL: Record<string, string> = {
  reprovado: "Reprovado",
  recuperacao: "Recuperação",
  aprovado: "Aprovado",
};

// Meu desempenho — visão agregada (notas + frequência por UC de todas as turmas).
// O detalhe por turma continua em /turmas/[id]/minhas-notas e /minha-frequencia.
export default async function MeuDesempenhoPage() {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  // Área do aluno; gestão tem painéis próprios.
  if (profile.role !== "aluno") redirect("/sem-acesso");

  const dash = await getStudentDashboard({ id: profile.id, xp: profile.xp ?? 0 });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Meu desempenho"
        description="Como você vai em cada unidade curricular, somando todas as suas turmas."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Aprovado" value={dash.resumo.aprovado} tone="success" />
        <StatCard title="Recuperação" value={dash.resumo.recuperacao} tone={dash.resumo.recuperacao ? "warning" : "default"} />
        <StatCard title="Reprovado" value={dash.resumo.reprovado} tone={dash.resumo.reprovado ? "danger" : "default"} />
        <StatCard
          title="Frequência média"
          value={dash.resumo.freqMedia != null ? `${dash.resumo.freqMedia}%` : "—"}
        />
      </div>

      <Card>
        <CardHeader title="Por unidade curricular" description="Clique em uma UC para ver o detalhe na turma." />
        {dash.desempenho.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda não há notas ou frequência lançadas nas suas turmas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1">UC</th>
                  <th>Turma</th>
                  <th className="text-center">Média</th>
                  <th className="text-center">Frequência</th>
                  <th className="text-center">Situação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {dash.desempenho.map((d, i) => (
                  <tr key={`${d.uc}-${i}`} className="border-t border-border">
                    <td className="py-2">{d.uc}</td>
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
                        <span className="flex justify-end gap-3">
                          <Link href={`/turmas/${d.classId}/minhas-notas`} className="text-xs text-primary hover:underline">
                            notas
                          </Link>
                          <Link href={`/turmas/${d.classId}/minha-frequencia`} className="text-xs text-primary hover:underline">
                            frequência
                          </Link>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

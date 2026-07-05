import Link from "next/link";

import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { requireCapability } from "@/lib/auth/guard";
import { getUcSurveyAggregates } from "@/lib/uc-survey/aggregate";
import { SURVEY_TOPICS } from "@/lib/uc-survey/eligibility";

// Resultados ANÔNIMOS das pesquisas de UC — para o coordenador acompanhar a
// percepção dos alunos sobre infraestrutura e o decorrer das aulas.
export default async function PesquisasUcPage() {
  await requireCapability("supervisionar_turmas");
  const agregados = await getUcSurveyAggregates();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/coordenador" className="text-sm text-muted-foreground hover:text-foreground">
          ← Painel de coordenação
        </Link>
        <PageHeader
          title="📝 Pesquisas de UC"
          description="Feedback anônimo dos alunos ao fim de cada unidade curricular (infraestrutura e aulas)."
        />
      </div>

      {agregados.length === 0 ? (
        <EmptyState
          title="Nenhuma resposta ainda"
          description="As pesquisas aparecem aqui conforme os alunos respondem — elas abrem quando a UC termina."
          icon="📭"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {agregados.map((a) => (
            <Card key={a.classUnitId}>
              <CardHeader
                title={a.uc}
                description={a.turma}
                action={
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                    {a.respostas} resposta{a.respostas !== 1 ? "s" : ""}
                  </span>
                }
              />
              {/* Médias por tópico */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {SURVEY_TOPICS.map((t) => {
                  const nota = a.medias[t.id];
                  return (
                    <div key={t.id} className="rounded-xl border border-border bg-background/40 p-3">
                      <div className="text-xs text-muted-foreground">
                        {t.emoji} {t.label}
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className={`text-2xl font-bold ${notaTone(nota)}`}>
                          {nota != null ? nota.toFixed(1) : "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">/ 5</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Comentários (anônimos) */}
              {a.comentarios.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-sm font-medium">Comentários dos alunos</div>
                  <ul className="flex flex-col gap-2">
                    {a.comentarios.slice(0, 20).map((c, i) => (
                      <li
                        key={i}
                        className="rounded-lg border border-border bg-background/40 p-3 text-sm text-foreground"
                      >
                        “{c}”
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/** Cor da nota: verde (bom), amarelo (atenção), vermelho (crítico). */
function notaTone(n: number | null): string {
  if (n == null) return "text-muted-foreground";
  if (n >= 4) return "text-success";
  if (n >= 3) return "text-warning";
  return "text-danger";
}

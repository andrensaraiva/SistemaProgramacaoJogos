import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth/dal";
import { montarLinhaDoTempo, type Bloco } from "@/lib/dashboard/uc-timeline";
import { getAcessoTurma } from "@/lib/turmas/access";
import { createClient } from "@/lib/supabase/server";

import { AulasTimeline } from "./_aulas";

type Params = Promise<{ id: string; classUnitId: string }>;

const KIND_LABEL: Record<string, string> = {
  lista: "Lista",
  desafio: "Desafio",
  prova: "Prova",
  saep_simulado: "Simulado SAEP",
  sap_pratico: "SAP prático",
  projeto_integrador: "Projeto integrador",
  duelo: "Duelo",
  unity: "Unity",
};

function dataBR(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");
}

// Caminho da atividade conforme o tipo (mesma logica da pagina da turma).
function hrefAtividade(turmaId: string, classUnitId: string, a: { id: string; kind: string }): string {
  if (a.kind === "saep_simulado") return `/turmas/${turmaId}/ucs/${classUnitId}/simulados/${a.id}`;
  if (a.kind === "sap_pratico") return `/turmas/${turmaId}/ucs/${classUnitId}/sap/${a.id}`;
  if (a.kind === "projeto_integrador") return `/turmas/${turmaId}/ucs/${classUnitId}/projetos/${a.id}`;
  return `/turmas/${turmaId}/listas/${a.id}`;
}

export default async function UcDoAlunoPage({ params }: { params: Params }) {
  const { id, classUnitId } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const supabase = await createClient();

  // class_unit com UC e plano (RLS já garante que o aluno só vê a turma dele).
  const { data: cu } = await supabase
    .from("class_units")
    .select(
      "id, class_id, class:classes!class_id(id, name, owner_id), uc:curricular_units!uc_id(id, title, objetivo_geral), plan:teaching_plans!teaching_plan_id(id, title)",
    )
    .eq("id", classUnitId)
    .single();
  if (!cu || cu.class_id !== id) notFound();

  const cls = cu.class as unknown as { id: string; name: string; owner_id: string };
  const uc = cu.uc as unknown as { id: string; title: string; objetivo_geral: string | null } | null;
  const plan = cu.plan as unknown as { id: string; title: string } | null;
  const { podeGerenciar } = await getAcessoTurma(id, profile, cls.owner_id);

  // Aulas (frequência), dias do calendário, blocos do plano e atividades da UC.
  const [{ data: sessoes }, { data: dias }, { data: blocos }, { data: atividades }] = await Promise.all([
    supabase
      .from("attendance_sessions")
      .select("session_number, date, label")
      .eq("class_unit_id", classUnitId)
      .order("session_number"),
    supabase
      .from("calendar_days")
      .select("date, calendar:course_calendars!calendar_id(class_id)")
      .eq("class_unit_id", classUnitId),
    plan
      ? supabase
          .from("teaching_plan_blocks")
          .select("id, title, conteudo, apresentacao_url, aula_inicio, aula_fim, ord")
          .eq("plan_id", plan.id)
          .order("ord")
      : Promise.resolve({ data: [] as unknown[] }),
    supabase
      .from("assignments")
      .select("id, title, kind, due_at")
      .eq("class_unit_id", classUnitId)
      .order("created_at"),
  ]);

  // Quais atividades de código o aluno já resolveu (pra marcar ✓ na jornada).
  const atividadeIds = (atividades ?? []).map((a) => a.id);
  let solvedAssignments = new Set<string>();
  if (atividadeIds.length > 0) {
    const { data: aprovadas } = await supabase
      .from("submissions")
      .select("assignment_id")
      .eq("student_id", profile.id)
      .eq("status", "aprovado")
      .in("assignment_id", atividadeIds);
    solvedAssignments = new Set(
      (aprovadas ?? []).map((s) => s.assignment_id).filter(Boolean) as string[],
    );
  }

  const blocks: Bloco[] = (blocos ?? []).map((raw) => {
    const b = raw as Record<string, unknown>;
    return {
      id: b.id as string,
      title: b.title as string,
      conteudo: (b.conteudo as string | null) ?? null,
      apresentacaoUrl: (b.apresentacao_url as string | null) ?? null,
      aulaInicio: (b.aula_inicio as number | null) ?? null,
      aulaFim: (b.aula_fim as number | null) ?? null,
      ord: (b.ord as number) ?? 0,
    };
  });

  const calendarDias = (dias ?? [])
    .filter((d) => (d.calendar as unknown as { class_id: string } | null)?.class_id === id)
    .map((d) => ({ date: d.date as string }));

  const timeline = montarLinhaDoTempo(
    (sessoes ?? []).map((s) => ({ sessionNumber: s.session_number, date: s.date, label: s.label })),
    calendarDias,
    blocks,
  );

  const atividadesList = atividades ?? [];
  const resolvidas = atividadesList.filter((a) => solvedAssignments.has(a.id)).length;
  const totalAtividades = atividadesList.length;
  const pctAtividades = totalAtividades > 0 ? Math.round((resolvidas / totalAtividades) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/turmas/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
        ← {cls.name}
      </Link>

      <PageHeader
        title={uc?.title ?? "Unidade curricular"}
        description={uc?.objetivo_geral ?? "Reveja as aulas e refaça os exercícios desta UC."}
        actions={
          podeGerenciar ? (
            <Link href={`/turmas/${id}/ucs/${classUnitId}/atividades`} className="text-sm text-primary hover:underline">
              Gerenciar atividades →
            </Link>
          ) : undefined
        }
      />

      {/* Barra de progresso da UC — quantos exercícios já dominou */}
      {totalAtividades > 0 && (
        <Card className="bg-gradient-to-br from-primary/10 to-card">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Seu progresso nesta UC</span>
            <span className="text-muted-foreground">{resolvidas} de {totalAtividades} concluídos</span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
            <div className="xp-fill h-full rounded-full transition-all" style={{ width: `${pctAtividades}%` }} />
          </div>
        </Card>
      )}

      {/* 1) APRENDER — aulas e apresentações primeiro (onde o conteúdo vive) */}
      <Card>
        <CardHeader
          title="1. Aprenda — aulas e apresentações"
          description={plan ? `Conteúdo do plano: ${plan.title}` : "Reveja o conteúdo antes de praticar."}
        />
        <AulasTimeline aulas={timeline} />
      </Card>

      {/* 2) PRATICAR — atividades, com status do aluno e exemplo guiado */}
      <Card>
        <CardHeader
          title="2. Pratique — atividades e exercícios"
          description="Resolva as atividades. O que você já concluiu fica marcado com ✓."
        />
        {totalAtividades === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma atividade nesta UC ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {atividadesList.map((a) => {
              const solved = solvedAssignments.has(a.id);
              return (
                <li key={a.id}>
                  <Link
                    href={hrefAtividade(id, classUnitId, a)}
                    className={`group flex items-center justify-between gap-3 rounded-xl border p-3 text-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      solved ? "border-success/40 bg-success/5" : "border-border bg-background/40 hover:border-primary/40"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm ${
                          solved ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                        }`}
                        title={solved ? "Concluído" : "Pendente"}
                      >
                        {solved ? "✓" : "•"}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium group-hover:text-primary">{a.title}</span>
                        <span className="mt-0.5 flex items-center gap-2">
                          <Badge tone="neutral">{KIND_LABEL[a.kind] ?? a.kind}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {a.due_at ? `prazo ${dataBR(a.due_at)}` : "sem prazo"}
                          </span>
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground group-hover:text-primary">abrir →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

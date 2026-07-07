import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

type SubRow = {
  exercise_id: string;
  assignment_id: string | null;
  status: string;
  manual_grade: number | null;
  manual_feedback: string | null;
  created_at: string;
};

export default async function MinhasNotasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  const supabase = await createClient();

  const { data: turma } = await supabase
    .from("classes")
    .select("id, name, owner_id")
    .eq("id", id)
    .single();
  if (!turma) notFound();
  if (turma.owner_id === profile.id) redirect(`/turmas/${id}`);

  // Listas da turma + seus exercícios (para nomear as entregas).
  const { data: listas } = await supabase
    .from("assignments")
    .select("id, title, exercises:assignment_exercises(exercise:exercises!exercise_id(id, title, exercise_type))")
    .eq("class_id", id)
    .order("created_at");

  // Minhas submissões nesta turma (inclui entregas de grupo via RLS).
  const assignmentIds = (listas ?? []).map((l) => l.id);
  const { data: subs } = assignmentIds.length
    ? await supabase
        .from("submissions")
        .select("exercise_id, assignment_id, status, manual_grade, manual_feedback, created_at")
        .in("assignment_id", assignmentIds)
        .order("created_at", { ascending: false })
    : { data: [] as SubRow[] };

  // Última submissão por (assignment, exercise).
  const latest = new Map<string, SubRow>();
  for (const s of (subs ?? []) as SubRow[]) {
    const key = `${s.assignment_id}:${s.exercise_id}`;
    if (!latest.has(key)) latest.set(key, s);
  }

  const notas = [...latest.values()]
    .map((s) => s.manual_grade)
    .filter((g): g is number => g != null);
  const media =
    notas.length > 0
      ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1)
      : "—";

  const entregues = [...latest.values()].filter(
    (s) => s.status === "aprovado" || s.status === "entregue" || s.manual_grade != null,
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Turmas", href: "/turmas" },
          { label: turma.name, href: `/turmas/${id}` },
          { label: "Minhas notas" },
        ]}
      />
      <PageHeader title="Minhas notas" description={`Suas entregas e notas na turma ${turma.name}.`} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Média das notas" value={media} tone="primary" hint="das atividades corrigidas" />
        <StatCard title="Entregas feitas" value={entregues} hint="exercícios entregues/aprovados" />
        <StatCard title="Atividades" value={(listas ?? []).length} hint="listas nesta turma" />
      </div>

      <div className="flex flex-col gap-4">
        {(listas ?? []).map((lista) => {
          const exs = (lista.exercises as unknown as {
            exercise: { id: string; title: string; exercise_type: string };
          }[]).map((ae) => ae.exercise);

          return (
            <Card key={lista.id}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">{lista.title}</h2>
                <Link href={`/turmas/${id}/listas/${lista.id}`} className="text-xs text-primary hover:underline">
                  abrir lista →
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                {exs.map((ex) => {
                  const s = latest.get(`${lista.id}:${ex.id}`);
                  return (
                    <div key={ex.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm">
                      <span className="min-w-0 truncate">{ex.title}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        {s?.manual_grade != null && (
                          <Badge tone="primary">Nota {s.manual_grade}</Badge>
                        )}
                        <StatusBadge status={s?.status ?? "pendente"} />
                      </div>
                    </div>
                  );
                })}
                {exs.length === 0 && (
                  <p className="text-xs text-muted-foreground">Sem exercícios.</p>
                )}
              </div>
            </Card>
          );
        })}
        {(listas ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma atividade ainda.</p>
        )}
      </div>
    </div>
  );
}

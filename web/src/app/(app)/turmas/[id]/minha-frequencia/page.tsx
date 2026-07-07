import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

type Session = {
  id: string;
  session_number: number;
  period: number;
  date: string | null;
  label: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  presente: "Presente",
  atraso: "Atraso",
  falta: "Falta",
};
const STATUS_STYLE: Record<string, string> = {
  presente: "bg-success/15 text-success",
  atraso: "bg-warning/15 text-warning",
  falta: "bg-danger/15 text-danger",
  "—": "bg-muted text-muted-foreground",
};

export default async function MinhaFrequenciaPage({
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

  // Professor não usa esta tela — ele tem a grade completa.
  if (turma.owner_id === profile.id) {
    redirect(`/turmas/${id}/ucs`);
  }

  // UCs vinculadas à turma (o aluno lê via RLS de class_units).
  const { data: classUnits } = await supabase
    .from("class_units")
    .select("id, serie, uc:curricular_units!uc_id(title, carga_horaria_h)")
    .eq("class_id", id);

  // Carrega sessões e minhas marcas de cada UC.
  const blocos = await Promise.all(
    (classUnits ?? []).map(async (cu) => {
      const uc = cu.uc as unknown as {
        title: string;
        carga_horaria_h: number | null;
      } | null;

      const { data: sessions } = await supabase
        .from("attendance_sessions")
        .select("id, session_number, period, date, label")
        .eq("class_unit_id", cu.id)
        .order("session_number");

      const sessionIds = (sessions ?? []).map((s) => s.id);
      const { data: marks } = sessionIds.length
        ? await supabase
            .from("attendance_marks")
            .select("session_id, status")
            .eq("student_id", profile.id)
            .in("session_id", sessionIds)
        : { data: [] as { session_id: string; status: string }[] };

      const statusBySession = new Map(
        (marks ?? []).map((m) => [m.session_id, m.status]),
      );

      let presencas = 0;
      let faltas = 0;
      let atrasos = 0;
      for (const s of sessions ?? []) {
        const st = statusBySession.get(s.id);
        if (st === "presente") presencas++;
        else if (st === "falta") faltas++;
        else if (st === "atraso") atrasos++;
      }
      const totalRegistrado = presencas + faltas + atrasos;
      // Atraso conta como presença parcial para o percentual (meio ponto).
      const percentual =
        totalRegistrado > 0
          ? Math.round(((presencas + atrasos * 0.5) / totalRegistrado) * 100)
          : null;

      return {
        classUnitId: cu.id,
        title: uc?.title ?? "Unidade curricular",
        serie: cu.serie,
        cargaHoraria: uc?.carga_horaria_h ?? null,
        sessions: (sessions ?? []) as Session[],
        statusBySession,
        presencas,
        faltas,
        atrasos,
        percentual,
      };
    }),
  );

  const temAlgo = blocos.some((b) => b.sessions.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Turmas", href: "/turmas" },
          { label: turma.name, href: `/turmas/${id}` },
          { label: "Minha frequência" },
        ]}
      />

      <PageHeader
        eyebrow={turma.name}
        title="Minha frequência"
        description="Acompanhe suas presenças, faltas e atrasos por unidade curricular."
      />

      {!classUnits?.length && (
        <EmptyState
          title="Sem frequência ainda"
          description="Esta turma ainda não tem unidades curriculares com frequência."
          icon="📋"
        />
      )}

      {classUnits?.length && !temAlgo ? (
        <EmptyState
          title="Nenhuma aula registrada"
          description="Quando o professor lançar a frequência, ela aparece aqui."
          icon="📋"
        />
      ) : null}

      <div className="flex flex-col gap-5">
        {blocos
          .filter((b) => b.sessions.length > 0)
          .map((b) => (
            <Card key={b.classUnitId} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{b.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {b.serie ? `${b.serie} · ` : ""}
                    {b.cargaHoraria ? `${b.cargaHoraria}h · ` : ""}
                    {b.sessions.length} aula(s) registrada(s)
                  </p>
                </div>
                {b.percentual != null && (
                  <div
                    className={`rounded-xl px-4 py-2 text-center ${
                      b.percentual >= 75 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                    }`}
                  >
                    <div className="text-2xl font-bold leading-none tnum">
                      {b.percentual}%
                    </div>
                    <div className="text-[10px] uppercase tracking-wide">
                      presença
                    </div>
                  </div>
                )}
              </div>

              {/* Resumo */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <Resumo label="Presenças" value={b.presencas} tone="green" />
                <Resumo label="Atrasos" value={b.atrasos} tone="amber" />
                <Resumo label="Faltas" value={b.faltas} tone="red" />
              </div>

              {/* Lista de aulas */}
              <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
                {b.sessions.map((s) => {
                  const st = b.statusBySession.get(s.id) ?? "—";
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                    >
                      <div>
                        <span className="font-medium">
                          {s.date
                            ? new Date(s.date).toLocaleDateString("pt-BR")
                            : `Aula ${s.session_number}`}
                        </span>
                        <span className="ml-2 text-muted-foreground">
                          {s.period}ª aula
                        </span>
                        {s.label && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {s.label}
                          </span>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[st]}`}
                      >
                        {STATUS_LABEL[st] ?? "Sem registro"}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {b.percentual != null && b.percentual < 75 && (
                <p className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
                  ⚠️ Sua presença está abaixo de 75%. Fique atento à frequência
                  mínima exigida.
                </p>
              )}
            </Card>
          ))}
      </div>
    </div>
  );
}

function Resumo({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "red";
}) {
  const toneCls = {
    green: "text-success",
    amber: "text-warning",
    red: "text-danger",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className={`text-2xl font-bold tnum ${toneCls}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

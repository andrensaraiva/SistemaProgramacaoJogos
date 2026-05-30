import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

type Session = {
  id: string;
  session_number: number;
  date: string | null;
  label: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  presente: "Presente",
  atraso: "Atraso",
  falta: "Falta",
};
const STATUS_STYLE: Record<string, string> = {
  presente: "bg-green-500/15 text-green-700 dark:text-green-300",
  atraso: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
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
        .select("id, session_number, date, label")
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

      <div>
        <h1 className="text-3xl font-bold">Minha frequência</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Turma {turma.name}. Acompanhe suas presenças, faltas e atrasos por
          unidade curricular.
        </p>
      </div>

      {!classUnits?.length && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Esta turma ainda não tem unidades curriculares com frequência.
        </div>
      )}

      {classUnits?.length && !temAlgo ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhuma aula registrada ainda. Quando o professor lançar a frequência,
          ela aparece aqui.
        </div>
      ) : null}

      <div className="flex flex-col gap-5">
        {blocos
          .filter((b) => b.sessions.length > 0)
          .map((b) => (
            <section
              key={b.classUnitId}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5"
            >
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
                      b.percentual >= 75
                        ? "bg-green-500/10 text-green-700 dark:text-green-300"
                        : "bg-danger/10 text-danger"
                    }`}
                  >
                    <div className="text-2xl font-bold leading-none">
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
                        <span className="font-medium">Aula {s.session_number}</span>
                        {s.label && (
                          <span className="ml-2 text-muted-foreground">
                            {s.label}
                          </span>
                        )}
                        {s.date && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {new Date(s.date).toLocaleDateString("pt-BR")}
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
            </section>
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
    green: "text-green-700 dark:text-green-300",
    amber: "text-amber-700 dark:text-amber-300",
    red: "text-danger",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className={`text-2xl font-bold ${toneCls}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

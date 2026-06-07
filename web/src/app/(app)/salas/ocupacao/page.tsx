import { redirect } from "next/navigation";

import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getProfile } from "@/lib/auth/dal";
import { listarSalas } from "@/lib/rooms/actions";
import { computeOccupancy, type OccupancyDay } from "@/lib/rooms/occupancy";
import { createAdminClient } from "@/lib/supabase/admin";

function ymd(date: string) {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

export default async function OcupacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  if (profile.role !== "admin" && profile.role !== "coordenador") redirect("/painel");

  const { de, ate } = await searchParams;
  const admin = createAdminClient();

  // Dias com sala alocada, com a turma do calendário.
  let q = admin
    .from("calendar_days")
    .select("date, room_id, calendar:course_calendars!calendar_id(class_id, turma:classes!class_id(name))")
    .not("room_id", "is", null);
  if (de) q = q.gte("date", de);
  if (ate) q = q.lte("date", ate);
  const { data: rows } = await q.order("date");

  const salas = await listarSalas();
  const salaNome = new Map(salas.map((s) => [s.id, s.name]));

  const days: OccupancyDay[] = (rows ?? []).map((r) => {
    const cal = r.calendar as unknown as { class_id: string; turma: { name: string } | null } | null;
    return {
      date: r.date,
      roomId: r.room_id,
      classId: cal?.class_id ?? "",
      turma: cal?.turma?.name ?? "Turma",
    };
  });

  const occ = computeOccupancy(days);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ocupação de salas"
        description="Quais salas estão ocupadas, por data e turma. Conflitos (2 turmas na mesma sala/dia) em vermelho."
      />

      {/* Filtro de período */}
      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">De</span>
          <input name="de" type="date" defaultValue={de ?? ""} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Até</span>
          <input name="ate" type="date" defaultValue={ate ?? ""} className="rounded-lg border border-border bg-card px-3 py-2 text-sm" />
        </label>
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Filtrar
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Salas em uso" value={occ.porSala.size} tone="primary" />
        <StatCard title="Datas" value={occ.datas.length} />
        <StatCard
          title="Conflitos"
          value={occ.totalConflitos}
          tone={occ.totalConflitos ? "danger" : "default"}
          hint="mesma sala, 2 turmas, mesmo dia"
        />
      </div>

      <Card>
        <CardHeader title="Grade de ocupação" description="Cada célula mostra a turma que ocupa a sala naquele dia." />
        {occ.slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma ocupação no período. Aloque salas no calendário das turmas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-card p-2 text-left">Sala</th>
                  {occ.datas.map((d) => (
                    <th key={d} className="border border-border p-1 font-medium">
                      {ymd(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...occ.porSala.entries()].map(([roomId, slots]) => {
                  const byDate = new Map(slots.map((s) => [s.date, s]));
                  return (
                    <tr key={roomId}>
                      <td className="sticky left-0 z-10 bg-card p-2 font-medium">
                        {salaNome.get(roomId) ?? "Sala"}
                      </td>
                      {occ.datas.map((d) => {
                        const slot = byDate.get(d);
                        if (!slot) return <td key={d} className="border border-border p-1" />;
                        return (
                          <td
                            key={d}
                            className={`border border-border p-1 text-center ${
                              slot.conflito ? "bg-danger/20 text-danger font-semibold" : "bg-primary/10"
                            }`}
                            title={slot.turmas.map((t) => t.turma).join(" + ")}
                          >
                            {slot.turmas.map((t) => t.turma).join(" / ")}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { requireGerenciarTurma } from "@/lib/turmas/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { CalendarioClient, type UcInfo } from "./_client";

type Params = Promise<{ id: string }>;

export default async function CalendarioPage({ params }: { params: Params }) {
  const { id } = await params;
  // Gestão: dono, co-docente, coordenador ou admin montam o calendário.
  await requireGerenciarTurma(id);

  const supabase = await createClient();
  const { data: turma } = await supabase.from("classes").select("id, name, owner_id").eq("id", id).single();
  if (!turma) notFound();

  const admin = createAdminClient();

  // UCs da turma (class_units → curricular_units).
  const { data: cus } = await admin
    .from("class_units")
    .select("id, uc:curricular_units!uc_id(title)")
    .eq("class_id", id);
  const ucs: UcInfo[] = (cus ?? []).map((c) => ({
    classUnitId: c.id as string,
    title: (c.uc as unknown as { title: string } | null)?.title ?? "UC",
  }));

  // Salas (para alocar no calendário).
  const { data: roomsRaw } = await admin.from("rooms").select("id, name, kind").order("name");
  const rooms = (roomsRaw ?? []).map((r) => ({ id: r.id as string, name: r.name as string }));

  // Calendário existente?
  const { data: cal } = await admin
    .from("course_calendars")
    .select("id, starts_on, ends_on, weekdays, aulas_por_dia")
    .eq("class_id", id)
    .maybeSingle();

  let days: { id: string; date: string; classUnitId: string | null; marker: string | null; note: string | null; roomId: string | null }[] = [];
  let targets: { classUnitId: string; chPresencial: number }[] = [];
  if (cal) {
    const [{ data: d }, { data: t }] = await Promise.all([
      admin.from("calendar_days").select("id, date, class_unit_id, marker, note, room_id").eq("calendar_id", cal.id).order("date"),
      admin.from("calendar_uc_targets").select("class_unit_id, ch_presencial, ord").eq("calendar_id", cal.id).order("ord"),
    ]);
    days = (d ?? []).map((x) => ({
      id: x.id,
      date: x.date,
      classUnitId: x.class_unit_id,
      marker: x.marker,
      note: x.note,
      roomId: x.room_id,
    }));
    targets = (t ?? []).map((x) => ({ classUnitId: x.class_unit_id, chPresencial: x.ch_presencial }));
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/turmas/${id}`} className="text-sm text-muted-foreground hover:text-foreground no-print">
        ← {turma.name}
      </Link>
      <CalendarioClient
        classId={id}
        turmaNome={turma.name}
        ucs={ucs}
        calendar={
          cal
            ? {
                id: cal.id,
                startsOn: cal.starts_on,
                endsOn: cal.ends_on,
                weekdays: cal.weekdays,
                aulasPorDia: cal.aulas_por_dia,
              }
            : null
        }
        days={days}
        targets={targets}
        rooms={rooms}
      />
    </div>
  );
}

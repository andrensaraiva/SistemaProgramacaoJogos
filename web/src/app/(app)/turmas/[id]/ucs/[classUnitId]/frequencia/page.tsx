import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import { FrequenciaGrid } from "./_grid";

export default async function FrequenciaPage({
  params,
}: {
  params: Promise<{ id: string; classUnitId: string }>;
}) {
  const { id, classUnitId } = await params;
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: cu } = await supabase
    .from("class_units")
    .select(
      "id, class_id, class:classes!class_id(id, name, owner_id), uc:curricular_units!uc_id(title)",
    )
    .eq("id", classUnitId)
    .single();
  if (!cu) notFound();

  const turma = cu.class as unknown as {
    id: string;
    name: string;
    owner_id: string;
  };
  if (turma.owner_id !== profile?.id) redirect(`/turmas/${id}`);

  const uc = cu.uc as unknown as { title: string } | null;

  const [{ data: membros }, { data: sessions }] = await Promise.all([
    supabase
      .from("class_members")
      .select("student:profiles!student_id(id, display_name)")
      .eq("class_id", turma.id)
      .order("joined_at"),
    supabase
      .from("attendance_sessions")
      .select("id, session_number, date, label")
      .eq("class_unit_id", classUnitId)
      .order("session_number"),
  ]);

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: marks } = sessionIds.length
    ? await supabase
        .from("attendance_marks")
        .select("session_id, student_id, status")
        .in("session_id", sessionIds)
    : { data: [] as { session_id: string; student_id: string; status: string }[] };

  const students = (membros ?? []).map((m) => {
    const s = m.student as unknown as { id: string; display_name: string };
    return { id: s.id, name: s.display_name };
  });

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Turmas", href: "/turmas" },
          { label: turma.name, href: `/turmas/${id}` },
          { label: "Unidades curriculares", href: `/turmas/${id}/ucs` },
          { label: "Frequência" },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold">Frequência</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {uc?.title ? `${uc.title} · ` : ""}Turma {turma.name}. Clique nas
          células para alternar presente → atraso → falta.
        </p>
      </div>

      <FrequenciaGrid
        classUnitId={classUnitId}
        students={students}
        sessions={(sessions ?? []).map((s) => ({
          id: s.id,
          number: s.session_number,
          date: s.date,
          label: s.label,
        }))}
        marks={(marks ?? []).map((m) => ({
          sessionId: m.session_id,
          studentId: m.student_id,
          status: m.status as "presente" | "falta" | "atraso",
        }))}
      />
    </div>
  );
}

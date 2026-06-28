import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type MeuGrupo = {
  id: string;
  name: string;
  members: { id: string; display_name: string }[];
};

/**
 * Grupo do aluno numa turma (com os colegas), ou null se ele não está em grupo.
 * Usado nas atividades em grupo pra mostrar "Meu grupo" ao aluno.
 */
export async function getMeuGrupo(
  classId: string,
  studentId: string,
): Promise<MeuGrupo | null> {
  const admin = createAdminClient();

  // Grupo do aluno nesta turma.
  const { data: mine } = await admin
    .from("class_group_members")
    .select("group_id, group:class_groups!group_id(id, name, class_id)")
    .eq("student_id", studentId);

  const row = (mine ?? []).find((m) => {
    const g = m.group as unknown as { class_id: string } | undefined;
    return g?.class_id === classId;
  });
  if (!row) return null;
  const grp = row.group as unknown as { id: string; name: string };

  // Colegas do grupo.
  const { data: members } = await admin
    .from("class_group_members")
    .select("student:profiles!student_id(id, display_name)")
    .eq("group_id", grp.id);

  return {
    id: grp.id,
    name: grp.name,
    members: (members ?? []).map((m) => {
      const s = m.student as unknown as { id: string; display_name: string };
      return { id: s.id, display_name: s.display_name };
    }),
  };
}

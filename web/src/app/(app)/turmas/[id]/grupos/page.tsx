import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import { GruposManager } from "./_manager";

export default async function GruposPage({
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
  if (turma.owner_id !== profile.id) redirect(`/turmas/${id}`);

  const { data: membros } = await supabase
    .from("class_members")
    .select("student:profiles!student_id(id, display_name)")
    .eq("class_id", id)
    .order("joined_at");
  const alunos = (membros ?? []).map((m) => {
    const s = m.student as unknown as { id: string; display_name: string };
    return { id: s.id, name: s.display_name };
  });

  const { data: grupos } = await supabase
    .from("class_groups")
    .select("id, name, members:class_group_members(student_id)")
    .eq("class_id", id)
    .order("created_at");

  const gruposView = (grupos ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    memberIds: (g.members as unknown as { student_id: string }[]).map(
      (m) => m.student_id,
    ),
  }));

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Turmas", href: "/turmas" },
          { label: turma.name, href: `/turmas/${id}` },
          { label: "Grupos" },
        ]}
      />
      <PageHeader
        title="Grupos"
        description="Monte os grupos da turma para os trabalhos em grupo. A entrega de um exercício em grupo vale para todos os membros."
      />
      <GruposManager classId={id} alunos={alunos} grupos={gruposView} />
    </div>
  );
}

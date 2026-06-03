import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { StatusBadge } from "@/components/ui/status-badge";
import { getProfile } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { refreshGithubRepo } from "@/app/(app)/unity/github/actions";
import { Button } from "@/components/ui/button";
import { UnityRepoForm } from "./_form";

type Params = Promise<{ id: string; classUnitId: string }>;

export default async function UnityUcPage({ params }: { params: Params }) {
  const { id, classUnitId } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const supabase = await createClient();
  const { data: cu } = await supabase
    .from("class_units")
    .select(
      "id, class_id, class:classes!class_id(id, name, owner_id), uc:curricular_units!uc_id(id, title)",
    )
    .eq("id", classUnitId)
    .single();
  if (!cu || cu.class_id !== id) notFound();

  const cls = cu.class as unknown as { id: string; name: string; owner_id: string };
  const uc = cu.uc as unknown as { id: string; title: string } | null;
  const isOwner = cls.owner_id === profile.id;

  // Só o professor dono gerencia a sincronização Unity da UC.
  if (!isOwner) redirect(`/turmas/${id}/ucs/${classUnitId}/atividades`);

  const admin = createAdminClient();
  const { data: repos } = await admin
    .from("github_classroom_repos")
    .select(
      "id, repo_full_name, student_name, assignment_title, latest_status, latest_score, latest_run_url, last_checked_at",
    )
    .eq("class_unit_id", classUnitId)
    .order("last_checked_at", { ascending: false, nullsFirst: false });

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Turmas", href: "/turmas" },
          { label: cls.name, href: `/turmas/${id}` },
          { label: "Unidades curriculares", href: `/turmas/${id}/ucs` },
          { label: uc?.title ?? "UC" },
          { label: "Unity" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold">Unity · {uc?.title ?? "UC"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Repositórios do GitHub Classroom vinculados a esta unidade curricular.
        </p>
      </div>

      <UnityRepoForm classId={id} classUnitId={classUnitId} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Repositórios sincronizados</h2>
        {(repos ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhum repositório sincronizado nesta UC ainda.
          </div>
        )}
        {(repos ?? []).map((repo) => (
          <div
            key={repo.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div>
              <div className="font-mono text-sm font-semibold">
                {repo.repo_full_name}
              </div>
              <div className="text-xs text-muted-foreground">
                {repo.student_name ? `${repo.student_name} · ` : ""}
                {repo.assignment_title ?? "sem atividade"}
                {repo.last_checked_at
                  ? ` · ${new Date(repo.last_checked_at).toLocaleString("pt-BR")}`
                  : ""}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {repo.latest_score != null && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                  {repo.latest_score}%
                </span>
              )}
              {repo.latest_status && <StatusBadge status={repo.latest_status} />}
              <form action={refreshGithubRepo}>
                <input type="hidden" name="repo_full_name" value={repo.repo_full_name} />
                <input type="hidden" name="class_id" value={id} />
                <input type="hidden" name="class_unit_id" value={classUnitId} />
                <input type="hidden" name="student_name" value={repo.student_name ?? ""} />
                <input
                  type="hidden"
                  name="assignment_title"
                  value={repo.assignment_title ?? ""}
                />
                <Button type="submit" variant="secondary">
                  Atualizar
                </Button>
              </form>
              {repo.latest_run_url && (
                <a
                  href={repo.latest_run_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Ver execução
                </a>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

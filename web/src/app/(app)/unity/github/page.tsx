import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

import { GithubRepoForm } from "./_github-form";
import { refreshGithubRepo } from "./actions";

type ClassroomRepo = {
  id: string;
  class_id: string | null;
  repo_full_name: string;
  student_name: string | null;
  assignment_title: string | null;
  latest_status: string | null;
  latest_score: number | null;
  latest_commit_sha: string | null;
  latest_run_url: string | null;
  last_checked_at: string | null;
};

type ClassRow = { id: string; name: string };

const STATUS_LABEL: Record<string, string> = {
  success: "Aprovado",
  failure: "Falhou",
  cancelled: "Cancelado",
  in_progress: "Rodando",
  queued: "Na fila",
  sem_execucoes: "Sem execucoes",
};

export default async function GithubClassroomPage() {
  const profile = await getProfile();
  if (!profile || !["professor", "admin"].includes(profile.role)) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Apenas professores podem sincronizar notas do GitHub Classroom.
        </p>
      </div>
    );
  }

  const admin = createAdminClient();
  const [{ data: classes }, { data: repos }] = await Promise.all([
    admin
      .from("classes")
      .select("id, name")
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: false }),
    admin
      .from("github_classroom_repos")
      .select(
        "id, class_id, repo_full_name, student_name, assignment_title, latest_status, latest_score, latest_commit_sha, latest_run_url, last_checked_at",
      )
      .eq("owner_id", profile.id)
      .order("last_checked_at", { ascending: false, nullsFirst: false }),
  ]);

  const classNames = new Map(
    ((classes ?? []) as ClassRow[]).map((cls) => [cls.id, cls.name]),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Notas do GitHub Classroom</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Puxe o resultado mais recente do GitHub Actions dos repositorios dos
            alunos e acompanhe a nota estimada dentro da plataforma.
          </p>
        </div>
        <Link href="/unity">
          <Button variant="secondary">Voltar</Button>
        </Link>
      </div>

      <GithubRepoForm classes={(classes ?? []) as ClassRow[]} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Repositorios acompanhados</h2>

        {(!repos || repos.length === 0) && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhum repositorio sincronizado ainda.
          </div>
        )}

        {((repos ?? []) as ClassroomRepo[]).map((repo) => (
          <div key={repo.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">{repo.repo_full_name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {repo.student_name ?? "Aluno nao informado"}
                  {repo.assignment_title ? ` - ${repo.assignment_title}` : ""}
                  {repo.class_id ? ` - ${classNames.get(repo.class_id) ?? "Turma"}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                    {STATUS_LABEL[repo.latest_status ?? ""] ??
                      repo.latest_status ??
                      "Nao sincronizado"}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                    Nota: {repo.latest_score ?? 0}%
                  </span>
                  {repo.latest_commit_sha && (
                    <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-muted-foreground">
                      {repo.latest_commit_sha.slice(0, 7)}
                    </span>
                  )}
                </div>
                {repo.last_checked_at && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Atualizado em{" "}
                    {new Date(repo.last_checked_at).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {repo.latest_run_url && (
                  <a href={repo.latest_run_url} target="_blank" rel="noreferrer">
                    <Button variant="secondary">Abrir Actions</Button>
                  </a>
                )}
                <form action={refreshGithubRepo}>
                  <input
                    type="hidden"
                    name="repo_full_name"
                    value={repo.repo_full_name}
                  />
                  <input
                    type="hidden"
                    name="student_name"
                    value={repo.student_name ?? ""}
                  />
                  <input
                    type="hidden"
                    name="assignment_title"
                    value={repo.assignment_title ?? ""}
                  />
                  <input
                    type="hidden"
                    name="class_id"
                    value={repo.class_id ?? ""}
                  />
                  <Button type="submit">Atualizar</Button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

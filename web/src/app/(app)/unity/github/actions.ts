"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { getProfile, verifySession } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export type GithubRepoState =
  | { errors?: Record<string, string[]>; message?: string }
  | undefined;

const RepoSchema = z.object({
  repo_full_name: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Use o formato dono/repositorio"),
  student_name: z.string().trim().optional(),
  assignment_title: z.string().trim().optional(),
  class_id: z.string().uuid().optional().or(z.literal("")),
  // Unity agora é atividade da UC: o repo pode vincular ao class_unit e à
  // atividade (assignment kind='unity'). Ambos opcionais por compat.
  class_unit_id: z.string().uuid().optional().or(z.literal("")),
  assignment_id: z.string().uuid().optional().or(z.literal("")),
});

type GithubRun = {
  id: number;
  head_sha: string;
  html_url: string;
  status: string;
  conclusion: string | null;
  jobs_url: string;
};

type GithubJob = {
  status: string;
  conclusion: string | null;
};

async function requireProfessor() {
  await verifySession();
  const profile = await getProfile();

  if (!profile || !["professor", "admin"].includes(profile.role)) {
    throw new Error("Apenas professores podem sincronizar repositorios.");
  }

  return profile;
}

async function githubFetch<T>(url: string): Promise<T> {
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub respondeu ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function fetchLatestGrade(repoFullName: string) {
  const runs = await githubFetch<{ workflow_runs: GithubRun[] }>(
    `https://api.github.com/repos/${repoFullName}/actions/runs?per_page=1`,
  );
  const latestRun = runs.workflow_runs[0];

  if (!latestRun) {
    return {
      latest_status: "sem_execucoes",
      latest_score: null,
      latest_commit_sha: null,
      latest_run_url: null,
    };
  }

  const jobs = await githubFetch<{ jobs: GithubJob[] }>(latestRun.jobs_url);
  const completedJobs = jobs.jobs.filter((job) => job.status === "completed");
  const passedJobs = completedJobs.filter((job) => job.conclusion === "success");
  const score =
    completedJobs.length > 0
      ? Math.round((passedJobs.length / completedJobs.length) * 100)
      : null;

  return {
    latest_status: latestRun.conclusion ?? latestRun.status,
    latest_score: score,
    latest_commit_sha: latestRun.head_sha,
    latest_run_url: latestRun.html_url,
  };
}

async function syncGithubRepoData(formData: FormData): Promise<GithubRepoState> {
  const profile = await requireProfessor();
  const parsed = RepoSchema.safeParse({
    repo_full_name: formData.get("repo_full_name"),
    student_name: formData.get("student_name"),
    assignment_title: formData.get("assignment_title"),
    class_id: formData.get("class_id"),
    class_unit_id: formData.get("class_unit_id"),
    assignment_id: formData.get("assignment_id"),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    const grade = await fetchLatestGrade(parsed.data.repo_full_name);
    const admin = createAdminClient();

    const { error } = await admin.from("github_classroom_repos").upsert(
      {
        owner_id: profile.id,
        class_id: parsed.data.class_id || null,
        class_unit_id: parsed.data.class_unit_id || null,
        assignment_id: parsed.data.assignment_id || null,
        repo_full_name: parsed.data.repo_full_name,
        student_name: parsed.data.student_name || null,
        assignment_title: parsed.data.assignment_title || null,
        ...grade,
        last_checked_at: new Date().toISOString(),
      },
      { onConflict: "owner_id,repo_full_name" },
    );

    if (error) return { message: error.message };
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel consultar o GitHub.",
    };
  }

  // Revalida tanto a tela global quanto a da UC (se houver vínculo).
  revalidatePath("/unity/github");
  if (parsed.data.class_unit_id && parsed.data.class_id) {
    revalidatePath(
      `/turmas/${parsed.data.class_id}/ucs/${parsed.data.class_unit_id}/unity`,
    );
  }
  return { message: "Repositorio sincronizado." };
}

export async function syncGithubRepo(
  _prev: GithubRepoState,
  formData: FormData,
): Promise<GithubRepoState> {
  return syncGithubRepoData(formData);
}

export async function refreshGithubRepo(formData: FormData) {
  await syncGithubRepoData(formData);
}

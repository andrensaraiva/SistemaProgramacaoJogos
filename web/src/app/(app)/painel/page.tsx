import Link from "next/link";

import { StudentOnboardingTour } from "@/components/student-onboarding-tour";
import {
  UpcomingDeadlines,
  type DeadlineItem,
} from "@/components/upcoming-deadlines";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export default async function PainelPage() {
  const profile = await getProfile();

  if (!profile) {
    return (
      <div className="rounded-2xl border border-danger/40 bg-danger/10 p-6">
        <h1 className="text-xl font-semibold">Perfil nao encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sua sessao foi criada, mas o perfil ainda nao existe no banco.
          Verifique se a migration inicial do Supabase foi aplicada e se
          `SUPABASE_SERVICE_ROLE_KEY` esta configurada no `.env.local`.
        </p>
      </div>
    );
  }

  const isProf = profile?.role === "professor" || profile?.role === "admin";

  const supabase = await createClient();

  let turmasCount = 0;
  let turmasRecentes: { id: string; name: string }[] = [];

  if (isProf) {
    const { data } = await supabase
      .from("classes")
      .select("id, name")
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(3);
    turmasRecentes = data ?? [];
    turmasCount = turmasRecentes.length;
  } else {
    const { data } = await supabase
      .from("class_members")
      .select("class:classes!class_id(id, name)")
      .eq("student_id", profile.id)
      .order("joined_at", { ascending: false })
      .limit(3);
    turmasRecentes =
      (data ?? []).map((m) => {
        const c = m.class as unknown as { id: string; name: string };
        return c;
      }) ?? [];
    turmasCount = turmasRecentes.length;
  }

  const { count: badgeCount } = await supabase
    .from("user_badges")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.id);

  // Próximas entregas: assignments com prazo das turmas do usuário.
  const deadlines = await loadUpcomingDeadlines(supabase, profile.id, isProf);

  return (
    <div className="flex flex-col gap-8">
      {!isProf && <StudentOnboardingTour />}

      <PageHeader
        title={`Olá, ${profile?.display_name ?? ""}!`}
        description={
          isProf
            ? "Bem-vindo de volta. Acompanhe suas turmas e crie novos exercícios."
            : `Bora resolver alguns exercícios? Você está no nível ${profile?.level}.`
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="XP total" value={`${profile?.xp ?? 0}`} tone="primary" hint="pontos de experiência" />
        <StatCard title="Nível" value={`${profile?.level ?? 1}`} hint="continue resolvendo pra subir" />
        <StatCard
          title="Conquistas"
          value={String(badgeCount ?? 0)}
          hint="resolva exercícios pra desbloquear"
        />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <QuickCard
          title={isProf ? "Minhas turmas" : "Minhas turmas"}
          description={
            isProf
              ? "Gerencie turmas, crie listas e acompanhe o progresso."
              : "Veja as listas atribuídas e acompanhe seu progresso."
          }
          action={
            <Link href="/turmas">
              <Button variant="secondary">Ver turmas</Button>
            </Link>
          }
          extra={
            turmasRecentes.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-1">
                {turmasRecentes.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/turmas/${t.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null
          }
        />

        <QuickCard
          title="Exercícios"
          description="Resolva exercícios, ganhe XP e suba de nível."
          action={
            <Link href="/exercicios">
              <Button variant="secondary">Ver exercícios</Button>
            </Link>
          }
        />
      </div>

      <UpcomingDeadlines items={deadlines} />

      {isProf && turmasCount === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold">Crie sua primeira turma</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Organize alunos em turmas e atribua listas de exercícios.
          </p>
          <div className="mt-4">
            <Link href="/turmas/nova">
              <Button>+ Nova turma</Button>
            </Link>
          </div>
        </div>
      )}

      {!isProf && turmasCount === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold">Entre em uma turma</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Peça o código de convite ao seu professor para começar.
          </p>
          <div className="mt-4">
            <Link href="/turmas/entrar">
              <Button>Entrar com código</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function loadUpcomingDeadlines(
  supabase: SupabaseServerClient,
  profileId: string,
  isProf: boolean,
): Promise<DeadlineItem[]> {
  // 1. IDs das turmas do usuário (dono, se professor; matrícula, se aluno).
  let classIds: string[] = [];
  if (isProf) {
    const { data } = await supabase
      .from("classes")
      .select("id")
      .eq("owner_id", profileId);
    classIds = (data ?? []).map((c) => c.id);
  } else {
    const { data } = await supabase
      .from("class_members")
      .select("class_id")
      .eq("student_id", profileId);
    classIds = (data ?? []).map((m) => m.class_id);
  }

  if (classIds.length === 0) return [];

  // 2. Assignments com prazo, ordenados pelo mais próximo. Inclui as atrasadas
  //    dos últimos 7 dias para o aluno não perder o que ficou para trás.
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data } = await supabase
    .from("assignments")
    .select("id, title, due_at, class:classes!class_id(id, name)")
    .in("class_id", classIds)
    .not("due_at", "is", null)
    .gte("due_at", sevenDaysAgo)
    .order("due_at", { ascending: true })
    .limit(6);

  return (data ?? []).map((a) => {
    const cls = a.class as unknown as { id: string; name: string };
    return {
      assignmentId: a.id,
      classId: cls.id,
      title: a.title,
      className: cls.name,
      dueAt: a.due_at as string,
    };
  });
}

function QuickCard({
  title,
  description,
  action,
  extra,
  badge,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
  extra?: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">{title}</h2>
          {badge && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        {extra}
      </div>
      <div>{action}</div>
    </div>
  );
}

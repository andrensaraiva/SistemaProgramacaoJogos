import { redirect } from "next/navigation";

import { type DeadlineItem } from "@/components/upcoming-deadlines";
import { getProfile } from "@/lib/auth/dal";
import { coinBalance } from "@/lib/cosmetics/coins";
import { getStudentDashboard } from "@/lib/dashboard/student";
import { getMissoesDoDia } from "@/lib/gamification/missions-actions";
import { registrarVisita } from "@/lib/gamification/streak-actions";
import { getTeacherDashboard } from "@/lib/dashboard/teacher";
import { getFeedbackResumo } from "@/lib/feedback/actions";
import { createClient } from "@/lib/supabase/server";

import { PainelAluno } from "./_aluno";
import { PainelProfessor } from "./_professor";

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

  // Gestão tem painel próprio: coordenador → /coordenador, admin → /admin.
  // (O /painel é a casa de aluno e professor.) Espelha homeDe().
  if (profile.role === "coordenador") redirect("/coordenador");
  if (profile.role === "admin") redirect("/admin");

  const supabase = await createClient();

  // PROFESSOR: painel próprio (a corrigir, aulas de hoje, em risco, feedback).
  if (profile.role === "professor") {
    const [dash, deadlines, feedback] = await Promise.all([
      getTeacherDashboard(profile.id),
      loadUpcomingDeadlines(supabase, profile.id, true),
      getFeedbackResumo(profile.id),
    ]);
    return (
      <PainelProfessor
        nome={profile.display_name ?? ""}
        dash={dash}
        deadlines={deadlines}
        feedback={feedback}
      />
    );
  }

  // ALUNO: painel gamificado (nível/XP/conquistas) + pendências + desempenho.
  // Registra a "ofensiva diária" (streak) ao abrir o painel.
  const [dash, deadlines, streak, missoes] = await Promise.all([
    getStudentDashboard({ id: profile.id, xp: profile.xp ?? 0 }),
    loadUpcomingDeadlines(supabase, profile.id, false),
    registrarVisita(
      profile.id,
      profile.current_streak ?? 0,
      profile.longest_streak ?? 0,
      profile.last_active_on ?? null,
    ),
    getMissoesDoDia(profile.id, {
      current: profile.current_streak ?? 0,
      longest: profile.longest_streak ?? 0,
      lastActiveOn: profile.last_active_on ?? null,
    }),
  ]);
  const moedas = coinBalance(profile.level, profile.coins_bonus, profile.coins_spent);
  return (
    <PainelAluno
      nome={profile.display_name ?? ""}
      dash={dash}
      deadlines={deadlines}
      streak={streak}
      missoes={missoes}
      avatar={{
        frameId: profile.avatar_frame_id,
        skinId: profile.avatar_skin_id,
        moedas,
      }}
    />
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

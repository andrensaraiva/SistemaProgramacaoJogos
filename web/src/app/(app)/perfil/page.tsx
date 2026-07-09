import { redirect } from "next/navigation";

import { AchievementConstellation, type ConstellationStar } from "@/components/achievement-constellation";
import { Card } from "@/components/ui/card";
import { getProfile } from "@/lib/auth/dal";
import { coinBalance } from "@/lib/cosmetics/coins";
import { bannerById, freeIds } from "@/lib/cosmetics/registry";
import { getTeacherDashboard } from "@/lib/dashboard/teacher";
import { getFeedbackResumo } from "@/lib/feedback/actions";
import { displayStreak, todayLocalISO } from "@/lib/gamification/streak";
import { createClient } from "@/lib/supabase/server";

import { PerfilHeader } from "./_header";
import { PerfilProfessor } from "./_professor";
import { CosmeticShop } from "./_shop";

// Perfil — ramifica por papel: aluno (estilo Discord: banner+avatar+cosméticos+
// constelação) ou professor (identidade profissional + impacto + reputação).
// Admin/coordenador são barrados de /perfil pelo middleware.
export default async function PerfilPage() {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  if (profile.role !== "aluno" && profile.role !== "professor") redirect("/painel");

  const supabase = await createClient();

  // PROFESSOR: perfil profissional (turmas, alunos, exercícios, reputação).
  if (profile.role === "professor") {
    const [dash, feedback, exercicios, turmas] = await Promise.all([
      getTeacherDashboard(profile.id),
      getFeedbackResumo(profile.id),
      supabase.from("exercises").select("id", { count: "exact", head: true }).eq("author_id", profile.id),
      supabase.from("classes").select("id, name").eq("owner_id", profile.id).order("name"),
    ]);
    return (
      <PerfilProfessor
        nome={profile.display_name ?? ""}
        emailInstitucional={profile.institutional_email}
        emailPessoal={profile.personal_email}
        frameId={profile.avatar_frame_id}
        skinId={profile.avatar_skin_id}
        turmasCount={dash.turmasCount}
        alunosCount={dash.alunosCount}
        exerciciosCount={exercicios.count ?? 0}
        feedback={feedback}
        turmas={turmas.data ?? []}
      />
    );
  }

  const [{ data: allBadges }, { data: myBadges }, { data: owned }] = await Promise.all([
    supabase.from("badges").select("id, title, description").order("id"),
    supabase.from("user_badges").select("badge_id").eq("user_id", profile.id),
    supabase.from("user_cosmetics").select("cosmetic_id").eq("user_id", profile.id),
  ]);

  // Constelação: todas as conquistas do catálogo; as que o aluno tem ACENDEM.
  const unlockedSet = new Set((myBadges ?? []).map((b) => b.badge_id));
  const stars: ConstellationStar[] = (allBadges ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    description: b.description,
    unlocked: unlockedSet.has(b.id),
  }));
  const conquistas = unlockedSet.size;

  const level = profile.level;
  const xpNoNivel = profile.xp % 100;
  const banner = bannerById(profile.banner_id);
  const saldo = coinBalance(level, profile.coins_bonus, profile.coins_spent);
  const streak = displayStreak(
    {
      current: profile.current_streak ?? 0,
      longest: profile.longest_streak ?? 0,
      lastActiveOn: profile.last_active_on ?? null,
    },
    todayLocalISO(),
  );

  // Possuídos = comprados + grátis (de todos os tipos).
  const ownedIds = [
    ...(owned ?? []).map((o) => o.cosmetic_id),
    ...freeIds("frame"),
    ...freeIds("banner"),
    ...freeIds("avatar"),
  ];

  return (
    <div className="flex flex-col gap-8">
      <PerfilHeader
        displayName={profile.display_name}
        level={level}
        xpNoNivel={xpNoNivel}
        moedas={saldo}
        streak={streak}
        conquistas={conquistas ?? 0}
        duelRating={profile.duel_rating}
        duelWins={profile.duel_wins}
        duelLosses={profile.duel_losses}
        frameId={profile.avatar_frame_id}
        skinId={profile.avatar_skin_id}
        bannerStyle={banner.style}
      />

      {/* Constelação de Conquistas — céu de estrelas que acendem ao desbloquear */}
      {stars.length > 0 && (
        <Card>
          <AchievementConstellation stars={stars} />
        </Card>
      )}

      {/* Loja de cosméticos */}
      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Loja Celeste</h2>
          <p className="text-sm text-muted-foreground">
            Você tem <span className="font-medium text-foreground">{saldo} 🪙</span>. Compre cosméticos e equipe o que quiser — suba de nível para ganhar mais moedas.
          </p>
        </div>
        <CosmeticShop
          displayName={profile.display_name}
          level={level}
          balance={saldo}
          ownedIds={ownedIds}
          equippedFrameId={profile.avatar_frame_id}
          equippedBannerId={profile.banner_id}
          equippedAvatarId={profile.avatar_skin_id}
        />
      </Card>
    </div>
  );
}

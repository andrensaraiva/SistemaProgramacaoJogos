import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { getProfile } from "@/lib/auth/dal";
import { coinBalance } from "@/lib/cosmetics/coins";
import { bannerById, freeIds } from "@/lib/cosmetics/registry";
import { displayStreak, todayLocalISO } from "@/lib/gamification/streak";
import { createClient } from "@/lib/supabase/server";

import { PerfilHeader } from "./_header";
import { CosmeticShop } from "./_shop";

// Perfil do aluno — estilo Discord: banner + avatar (skin+moldura) + nível/XP,
// saldo de moedas e a loja de cosméticos comprados com moedas Celeste.
export default async function PerfilPage() {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  if (profile.role !== "aluno") redirect("/painel");

  const supabase = await createClient();
  const [{ count: conquistas }, { data: owned }] = await Promise.all([
    supabase
      .from("user_badges")
      .select("badge_id", { count: "exact", head: true })
      .eq("user_id", profile.id),
    supabase.from("user_cosmetics").select("cosmetic_id").eq("user_id", profile.id),
  ]);

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

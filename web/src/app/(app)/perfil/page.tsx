import { redirect } from "next/navigation";

import { AvatarWithFrame } from "@/components/avatar-with-frame";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { getProfile } from "@/lib/auth/dal";
import { coinBalance } from "@/lib/cosmetics/coins";
import { bannerById, freeIds } from "@/lib/cosmetics/registry";
import { createClient } from "@/lib/supabase/server";

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

  // Possuídos = comprados + grátis (de todos os tipos).
  const ownedIds = [
    ...(owned ?? []).map((o) => o.cosmetic_id),
    ...freeIds("frame"),
    ...freeIds("banner"),
    ...freeIds("avatar"),
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Cabeçalho estilo Discord: banner + avatar sobreposto */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-32 w-full sm:h-40" style={banner.style} />
        <div className="flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="-mt-10 flex items-end gap-4">
            <div className="rounded-full ring-4 ring-card">
              <AvatarWithFrame
                name={profile.display_name}
                frameId={profile.avatar_frame_id}
                skinId={profile.avatar_skin_id}
                size={84}
              />
            </div>
            <div className="pb-1">
              <h1 className="text-xl font-bold leading-tight">{profile.display_name}</h1>
              <p className="text-sm text-muted-foreground">Nível {level}</p>
            </div>
          </div>
          <div className="w-full sm:w-64">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Nível {level}</span>
              <span>{xpNoNivel}/100 XP</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="xp-fill h-full rounded-full" style={{ width: `${Math.min(100, xpNoNivel)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Moedas Celeste" value={`${saldo} 🪙`} hint="ganhe subindo de nível" />
        <StatCard title="Nível" value={level} hint="cada 100 XP = 1 nível" />
        <StatCard title="Conquistas" value={conquistas ?? 0} hint="badges desbloqueadas" />
        <StatCard title="Rating de duelo" value={profile.duel_rating} hint={`${profile.duel_wins}V / ${profile.duel_losses}D`} />
      </div>

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

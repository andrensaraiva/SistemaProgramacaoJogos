import { redirect } from "next/navigation";

import { AvatarWithFrame } from "@/components/avatar-with-frame";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { getProfile } from "@/lib/auth/dal";
import { bannerById, unlockedCount, nextUnlock } from "@/lib/cosmetics/registry";
import { createClient } from "@/lib/supabase/server";

import { CosmeticLocker } from "./_locker";

// Perfil do aluno — estilo Discord: banner + avatar com moldura + nível/XP e a
// vitrine de cosméticos desbloqueados por XP.
export default async function PerfilPage() {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  // Área de aluno; gestão/professor têm seus próprios painéis.
  if (profile.role !== "aluno") redirect("/painel");

  const supabase = await createClient();
  const { count: conquistas } = await supabase
    .from("user_badges")
    .select("badge_id", { count: "exact", head: true })
    .eq("user_id", profile.id);

  const level = profile.level;
  const xpNoNivel = profile.xp % 100;
  const banner = bannerById(profile.banner_id);
  const proxFrame = nextUnlock(level, "frame");
  const proxBanner = nextUnlock(level, "banner");

  return (
    <div className="flex flex-col gap-8">
      {/* Cabeçalho estilo Discord: banner + avatar sobreposto */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-32 w-full sm:h-40" style={banner.style} />
        <div className="flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="-mt-10 flex items-end gap-4">
            <div className="rounded-full ring-4 ring-card">
              <AvatarWithFrame name={profile.display_name} frameId={profile.avatar_frame_id} size={84} />
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
        <StatCard title="XP total" value={profile.xp} hint="pontos de experiência" />
        <StatCard title="Nível" value={level} hint="cada 100 XP = 1 nível" />
        <StatCard title="Conquistas" value={conquistas ?? 0} hint="badges desbloqueadas" />
        <StatCard title="Rating de duelo" value={profile.duel_rating} hint={`${profile.duel_wins}V / ${profile.duel_losses}D`} />
      </div>

      {/* Vitrine de cosméticos */}
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Vitrine</h2>
            <p className="text-sm text-muted-foreground">
              Você desbloqueou {unlockedCount(level, "frame")} molduras e {unlockedCount(level, "banner")} banners.
              {proxFrame && ` Próxima moldura no nível ${proxFrame.unlockLevel}.`}
              {!proxFrame && proxBanner && ` Próximo banner no nível ${proxBanner.unlockLevel}.`}
            </p>
          </div>
        </div>
        <CosmeticLocker
          level={level}
          displayName={profile.display_name}
          equippedFrameId={profile.avatar_frame_id}
          equippedBannerId={profile.banner_id}
        />
      </Card>
    </div>
  );
}

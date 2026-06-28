import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

import { AvatarWithFrame } from "@/components/avatar-with-frame";

// Cabeçalho do perfil estilo Discord, alinhado ao hero gamificado do painel:
// banner + avatar, barra de XP animada e cards de stat clicáveis/animados.
export function PerfilHeader({
  displayName,
  level,
  xpNoNivel,
  moedas,
  streak,
  conquistas,
  duelRating,
  duelWins,
  duelLosses,
  frameId,
  skinId,
  bannerStyle,
}: {
  displayName: string;
  level: number;
  xpNoNivel: number;
  moedas: number;
  streak: number;
  conquistas: number;
  duelRating: number;
  duelWins: number;
  duelLosses: number;
  frameId: string | null;
  skinId: string | null;
  bannerStyle: CSSProperties;
}) {
  return (
    <div className="flex flex-col gap-8">
      {/* Banner + avatar sobreposto */}
      <div className="reveal-up overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-32 w-full sm:h-40" style={bannerStyle} />
        <div className="flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="-mt-10 flex items-end gap-4">
            <div className="pop-in rounded-full ring-4 ring-card">
              <AvatarWithFrame name={displayName} frameId={frameId} skinId={skinId} size={84} />
            </div>
            <div className="pb-1">
              <h1 className="text-xl font-bold leading-tight">{displayName}</h1>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                Nível {level}
                {streak > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-500">
                    <span className="flame-pulse">🔥</span> {streak} dia{streak > 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
          </div>
          {/* Barra de XP animada (igual ao painel) */}
          <div className="w-full sm:w-64">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Nível {level}</span>
              <span>{xpNoNivel}/100 XP</span>
            </div>
            <div className="xp-shine relative mt-1 h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="xp-fill xp-grow h-full rounded-full"
                style={{ ["--xp-target" as string]: `${Math.min(100, Math.max(4, xpNoNivel))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats clicáveis e animados */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatLink
          href="/painel"
          title="Moedas Celeste"
          value={`${moedas} 🪙`}
          hint="suba de nível pra ganhar"
          delay="reveal-delay-1"
        />
        <StatLink
          href="/ranking"
          title="Nível"
          value={level}
          hint="ver ranking"
          tone="text-primary"
          delay="reveal-delay-2"
        />
        <StatLink
          href="/painel"
          title="Conquistas"
          value={conquistas}
          hint="badges desbloqueadas"
          delay="reveal-delay-3"
        />
        <StatLink
          href="/duelos"
          title="Rating de duelo"
          value={duelRating}
          hint={`${duelWins}V / ${duelLosses}D`}
          delay="reveal-delay-4"
        />
      </div>
    </div>
  );
}

function StatLink({
  href,
  title,
  value,
  hint,
  tone = "text-foreground",
  delay = "",
}: {
  href: string;
  title: string;
  value: ReactNode;
  hint?: string;
  tone?: string;
  delay?: string;
}) {
  return (
    <Link
      href={href}
      className={`reveal-up ${delay} group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg`}
    >
      <div className="text-sm font-medium text-muted-foreground">{title}</div>
      <div className={`mt-2 text-3xl font-bold ${tone}`}>{value}</div>
      {hint && (
        <div className="mt-1 text-xs text-muted-foreground transition-colors group-hover:text-primary">
          {hint} →
        </div>
      )}
    </Link>
  );
}

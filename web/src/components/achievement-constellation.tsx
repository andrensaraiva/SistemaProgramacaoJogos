// Constelação de Conquistas — Aurora Minimal.
// Cada conquista é uma estrela num céu; as desbloqueadas ACENDEM (dourado, com
// brilho) e as travadas ficam apagadas. Linhas finas ligam as estrelas formando
// a constelação. Puramente visual, sem assets — usa os dados de badges/user_badges.

export type ConstellationStar = {
  id: string;
  title: string;
  description?: string | null;
  unlocked: boolean;
};

// Emoji por conquista conhecida (cai numa estrela genérica se for nova).
const BADGE_EMOJI: Record<string, string> = {
  first_green: "🌱",
  streak_7: "🔥",
  no_paste: "✋",
  duel_win_5: "⚔️",
  ai_curious: "✨",
};

// Posições (em %) num céu 16:8. Espalhadas de forma agradável; ciclam se houver
// mais estrelas que posições. As x/y ficam recuadas p/ os rótulos não vazarem.
const POS = [
  { x: 14, y: 30 },
  { x: 32, y: 60 },
  { x: 50, y: 26 },
  { x: 68, y: 58 },
  { x: 86, y: 32 },
  { x: 22, y: 82 },
  { x: 78, y: 82 },
  { x: 50, y: 84 },
];

export function AchievementConstellation({ stars }: { stars: ConstellationStar[] }) {
  const acesas = stars.filter((s) => s.unlocked).length;
  const pts = stars.map((_, i) => POS[i % POS.length]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">✨ Minha constelação</h2>
        <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-semibold text-gold">
          {acesas}/{stars.length} estrelas acesas
        </span>
      </div>

      <div className="relative aspect-[16/8] w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/5">
        {/* Linhas da constelação (ligam estrelas consecutivas) */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full text-primary"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {pts.slice(1).map((p, i) => {
            const a = pts[i];
            const lit = stars[i].unlocked && stars[i + 1].unlocked;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={p.x}
                y2={p.y}
                stroke="currentColor"
                strokeWidth={0.4}
                opacity={lit ? 0.5 : 0.18}
              />
            );
          })}
        </svg>

        {/* Estrelas */}
        {stars.map((s, i) => {
          const p = pts[i];
          const emoji = BADGE_EMOJI[s.id] ?? "⭐";
          return (
            <div
              key={s.id}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              title={s.unlocked ? s.description ?? s.title : `${s.title} — ainda bloqueada`}
            >
              <span className="relative grid h-10 w-10 place-items-center">
                {s.unlocked && (
                  <span className="absolute inset-0 rounded-full bg-gold/30 blur-md" aria-hidden="true" />
                )}
                <span
                  className={`relative grid h-9 w-9 place-items-center rounded-full border text-lg ${
                    s.unlocked
                      ? "pop-in border-gold/60 bg-gold/15 text-foreground glow-xp"
                      : "border-border bg-muted/40 opacity-50 grayscale"
                  }`}
                >
                  {s.unlocked ? emoji : "🔒"}
                </span>
              </span>
              <span
                className={`mt-1 max-w-24 truncate text-center text-[11px] font-medium ${
                  s.unlocked ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.title}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {acesas === stars.length && stars.length > 0
          ? "🌟 Céu completo! Você desbloqueou todas as conquistas."
          : "Resolva exercícios, mantenha a ofensiva e vença duelos para acender novas estrelas."}
      </p>
    </div>
  );
}

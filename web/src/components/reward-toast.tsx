"use client";

import { useEffect, useState } from "react";

// Toast de recompensa — celebração ao aprovar um exercício: XP ganho, conquistas
// e um chuvisco de confete em CSS puro. Aparece sobreposto e some sozinho.

export type Reward = {
  xp: number;
  badges: { id: string; label: string }[];
  /** Moedas ganhas (ex.: missão diária). Opcional. */
  coins?: number;
  /** Subiu de nível com esta submissão? (opcional) */
  levelUpTo?: number | null;
};

const CONFETTI_COLORS = ["#22c55e", "#3b82f6", "#eab308", "#ec4899", "#a855f7"];

export function RewardToast({
  reward,
  onClose,
}: {
  reward: Reward | null;
  onClose: () => void;
}) {
  if (!reward) return null;
  // `key` força remontar a cada nova recompensa, reiniciando a animação limpa.
  return <RewardToastInner key={JSON.stringify(reward)} reward={reward} onClose={onClose} />;
}

function RewardToastInner({
  reward,
  onClose,
}: {
  reward: Reward;
  onClose: () => void;
}) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Some sozinho depois de uns segundos.
    const t = setTimeout(() => setLeaving(true), 4200);
    const t2 = setTimeout(onClose, 4600);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [onClose]);

  const temBadge = reward.badges.length > 0;
  const subiuNivel = reward.levelUpTo != null;
  const temCoins = (reward.coins ?? 0) > 0;
  // Recompensa só de moedas (missão) vs. de exercício aprovado.
  const soMoedas = temCoins && reward.xp === 0 && !temBadge && !subiuNivel;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div
        className={`reward-pop pointer-events-auto relative overflow-hidden rounded-2xl border border-success/40 bg-gradient-to-br from-success/20 via-card to-primary/10 px-6 py-4 shadow-2xl ${
          leaving ? "reward-leave" : ""
        }`}
      >
        {/* Confete */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="confetti"
              style={{
                left: `${(i / 14) * 100}%`,
                background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                animationDelay: `${(i % 5) * 0.12}s`,
              }}
            />
          ))}
        </div>

        <div className="relative flex items-center gap-4">
          <span className="text-3xl">{soMoedas ? "🪙" : subiuNivel ? "🎉" : "⚡"}</span>
          <div>
            <div className="text-base font-bold leading-tight">
              {subiuNivel
                ? `Nível ${reward.levelUpTo}! 🆙`
                : soMoedas
                  ? "Missão concluída!"
                  : "Exercício aprovado!"}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm">
              {reward.xp > 0 && (
                <span className="rounded-full bg-success/20 px-2.5 py-0.5 font-semibold text-success">
                  +{reward.xp} XP
                </span>
              )}
              {temCoins && (
                <span className="rounded-full bg-yellow-500/20 px-2.5 py-0.5 font-semibold text-yellow-600 dark:text-yellow-400">
                  +{reward.coins} 🪙
                </span>
              )}
              {temBadge &&
                reward.badges.map((b) => (
                  <span
                    key={b.id}
                    className="rounded-full bg-primary/15 px-2.5 py-0.5 font-medium text-primary"
                  >
                    🏅 {b.label}
                  </span>
                ))}
              {!temBadge && reward.xp === 0 && (
                <span className="text-muted-foreground">Mandou bem!</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { RewardToast, type Reward } from "@/components/reward-toast";
import { Card, CardHeader } from "@/components/ui/card";
import { resgatarMissao } from "@/lib/gamification/missions-actions";
import type { MissionProgress } from "@/lib/gamification/missions";

// Card de missões diárias no painel: mostra progresso e permite resgatar as
// moedas de cada missão concluída.
export function MissoesDiarias({ missoes }: { missoes: MissionProgress[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const [, start] = useTransition();

  const concluidas = missoes.filter((m) => m.completed).length;

  function resgatar(id: string) {
    setPendingId(id);
    start(async () => {
      const res = await resgatarMissao(id);
      setPendingId(null);
      if (res.ok) {
        setReward({ xp: 0, badges: [], coins: res.coins });
        router.refresh();
      }
    });
  }

  return (
    <Card className="reveal-up">
      <RewardToast reward={reward} onClose={() => setReward(null)} />
      <CardHeader
        title="🎯 Missões do dia"
        description="Complete pra ganhar moedas. Renova todo dia."
        action={
          <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {concluidas}/{missoes.length}
          </span>
        }
      />
      <ul className="flex flex-col gap-2">
        {missoes.map((m) => {
          const pct = Math.round((m.progress / m.def.target) * 100);
          return (
            <li
              key={m.def.id}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                m.completed ? "border-success/30 bg-success/5" : "border-border bg-background/40"
              }`}
            >
              <span className="text-xl">{m.def.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {m.def.title}
                  <span className="text-xs font-normal text-muted-foreground">🪙 {m.def.reward}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{m.def.description}</div>
                {m.def.target > 1 && (
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
              {m.claimed ? (
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  ✓ Resgatada
                </span>
              ) : m.completed ? (
                <button
                  type="button"
                  onClick={() => resgatar(m.def.id)}
                  disabled={pendingId === m.def.id}
                  className="shrink-0 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
                >
                  {pendingId === m.def.id ? "..." : "Resgatar 🪙"}
                </button>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {m.progress}/{m.def.target}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { AvatarWithFrame } from "@/components/avatar-with-frame";
import { equiparCosmetico } from "@/lib/cosmetics/actions";
import {
  catalog,
  isUnlocked,
  type Cosmetic,
  type CosmeticKind,
} from "@/lib/cosmetics/registry";

export function CosmeticLocker({
  level,
  displayName,
  equippedFrameId,
  equippedBannerId,
}: {
  level: number;
  displayName: string;
  equippedFrameId: string | null;
  equippedBannerId: string | null;
}) {
  const [tab, setTab] = useState<CosmeticKind>("frame");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const equippedId = tab === "frame" ? equippedFrameId : equippedBannerId;
  const items = catalog(tab);

  function equipar(id: string) {
    setMsg(null);
    start(async () => {
      const res = await equiparCosmetico(tab, id);
      setMsg({ ok: res.ok, text: res.message });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {(["frame", "banner"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => { setTab(k); setMsg(null); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === k ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {k === "frame" ? "Molduras" : "Banners"}
          </button>
        ))}
      </div>

      {msg && (
        <div
          className={`rounded-md px-3 py-2 text-sm ${
            msg.ok
              ? "border border-success/40 bg-success/10 text-success"
              : "border border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <CosmeticCard
            key={c.id}
            cosmetic={c}
            displayName={displayName}
            unlocked={isUnlocked(level, c)}
            equipped={equippedId === c.id || (equippedId == null && c.unlockLevel === 1)}
            pending={pending}
            onEquip={() => equipar(c.id)}
          />
        ))}
      </div>
    </div>
  );
}

function CosmeticCard({
  cosmetic,
  displayName,
  unlocked,
  equipped,
  pending,
  onEquip,
}: {
  cosmetic: Cosmetic;
  displayName: string;
  unlocked: boolean;
  equipped: boolean;
  pending: boolean;
  onEquip: () => void;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center ${
        equipped ? "border-primary/50 bg-primary/5" : "border-border bg-background/40"
      } ${!unlocked ? "opacity-60" : ""}`}
    >
      {cosmetic.kind === "frame" ? (
        <AvatarWithFrame name={displayName} frameId={cosmetic.id} size={48} />
      ) : (
        <div className="h-12 w-full rounded-lg border border-border" style={cosmetic.style} />
      )}
      <div className="text-sm font-medium">{cosmetic.name}</div>

      {!unlocked ? (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          🔒 Nível {cosmetic.unlockLevel}
        </span>
      ) : equipped ? (
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
          Equipado
        </span>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={onEquip}
          className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
        >
          {pending ? "..." : "Equipar"}
        </button>
      )}
    </div>
  );
}

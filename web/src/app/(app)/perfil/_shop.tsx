"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { AvatarWithFrame } from "@/components/avatar-with-frame";
import { comprarCosmetico, equiparCosmetico } from "@/lib/cosmetics/actions";
import {
  catalog,
  isFree,
  meetsLevel,
  type Cosmetic,
  type CosmeticKind,
} from "@/lib/cosmetics/registry";

const TAB_LABEL: Record<CosmeticKind, string> = {
  frame: "Molduras",
  banner: "Banners",
  avatar: "Avatares",
};

export function CosmeticShop({
  displayName,
  level,
  balance,
  ownedIds,
  equippedFrameId,
  equippedBannerId,
  equippedAvatarId,
}: {
  displayName: string;
  level: number;
  balance: number;
  ownedIds: string[];
  equippedFrameId: string | null;
  equippedBannerId: string | null;
  equippedAvatarId: string | null;
}) {
  const [tab, setTab] = useState<CosmeticKind>("frame");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const owned = useMemo(() => new Set(ownedIds), [ownedIds]);
  const equippedId =
    tab === "frame" ? equippedFrameId : tab === "banner" ? equippedBannerId : equippedAvatarId;
  const items = catalog(tab);

  function run(fn: () => Promise<{ ok: boolean; message: string }>) {
    setMsg(null);
    start(async () => {
      const res = await fn();
      setMsg({ ok: res.ok, text: res.message });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {(["frame", "banner", "avatar"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => { setTab(k); setMsg(null); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === k ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {TAB_LABEL[k]}
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
        {items.map((c) => {
          const isOwned = owned.has(c.id) || isFree(c);
          const isEquipped = equippedId === c.id || (equippedId == null && isFree(c));
          return (
            <ShopCard
              key={c.id}
              cosmetic={c}
              displayName={displayName}
              owned={isOwned}
              equipped={isEquipped}
              canLevel={meetsLevel(level, c)}
              affordable={balance >= c.price}
              pending={pending}
              onBuy={() => run(() => comprarCosmetico(c.kind, c.id))}
              onEquip={() => run(() => equiparCosmetico(c.kind, c.id))}
            />
          );
        })}
      </div>
    </div>
  );
}

function ShopCard({
  cosmetic,
  displayName,
  owned,
  equipped,
  canLevel,
  affordable,
  pending,
  onBuy,
  onEquip,
}: {
  cosmetic: Cosmetic;
  displayName: string;
  owned: boolean;
  equipped: boolean;
  canLevel: boolean;
  affordable: boolean;
  pending: boolean;
  onBuy: () => void;
  onEquip: () => void;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center ${
        equipped ? "border-primary/50 bg-primary/5" : "border-border bg-background/40"
      }`}
    >
      <Preview cosmetic={cosmetic} displayName={displayName} />
      <div className="text-sm font-medium">{cosmetic.name}</div>

      {equipped ? (
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
          Equipado
        </span>
      ) : owned ? (
        <button
          type="button"
          disabled={pending}
          onClick={onEquip}
          className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
        >
          {pending ? "..." : "Equipar"}
        </button>
      ) : !canLevel ? (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          🔒 Nível {cosmetic.minLevel}
        </span>
      ) : (
        <button
          type="button"
          disabled={pending || !affordable}
          onClick={onBuy}
          title={affordable ? "" : "Moedas insuficientes"}
          className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/15 disabled:opacity-50"
        >
          {pending ? "..." : `Comprar · ${cosmetic.price} 🪙`}
        </button>
      )}
    </div>
  );
}

function Preview({ cosmetic, displayName }: { cosmetic: Cosmetic; displayName: string }) {
  if (cosmetic.kind === "banner") {
    return <div className="h-12 w-full rounded-lg border border-border" style={cosmetic.style} />;
  }
  if (cosmetic.kind === "avatar") {
    return <AvatarWithFrame name={displayName} skinId={cosmetic.id} size={48} />;
  }
  return <AvatarWithFrame name={displayName} frameId={cosmetic.id} size={48} />;
}

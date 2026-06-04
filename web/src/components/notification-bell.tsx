"use client";

import Link from "next/link";
import { useState } from "react";

import { marcarLida, marcarTodasLidas, type Notificacao } from "@/lib/notifications/actions";

export function NotificationBell({
  notifications,
  unread,
}: {
  notifications: Notificacao[];
  unread: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificações${unread > 0 ? ` (${unread} não lidas)` : ""}`}
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-sm font-semibold">Notificações</span>
              {unread > 0 && (
                <form action={marcarTodasLidas}>
                  <button type="submit" className="text-xs text-primary hover:underline">
                    Marcar todas como lidas
                  </button>
                </form>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Nenhuma notificação.
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`border-b border-border px-3 py-2.5 text-sm last:border-0 ${
                      n.read_at ? "opacity-60" : "bg-primary/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">{n.title}</span>
                      {!n.read_at && (
                        <form action={marcarLida}>
                          <input type="hidden" name="id" value={n.id} />
                          <button
                            type="submit"
                            className="shrink-0 text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            marcar lida
                          </button>
                        </form>
                      )}
                    </div>
                    {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                    {n.link && (
                      <Link
                        href={n.link}
                        onClick={() => setOpen(false)}
                        className="mt-1 inline-block text-xs text-primary hover:underline"
                      >
                        Abrir
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

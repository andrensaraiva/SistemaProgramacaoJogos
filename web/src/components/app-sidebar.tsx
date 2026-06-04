"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/logo";
import { getNavGroups, type IconKey } from "@/lib/features";

type Item = { href: string; label: string; icon: ReactNode };
type Group = { title: string; items: Item[] };

// Ícones SVG inline (sem dependência). 18px, stroke currentColor.
const I = {
  painel: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>
  ),
  code: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6" /></svg>
  ),
  duelo: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2" /></svg>
  ),
  trofeu: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
  ),
  curso: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
  ),
  turma: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  unity: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
  ),
  saep: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
  ),
  admin: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>
  ),
};

// Mapa de IconKey (registro de features) -> SVG. Ícones são JSX, então ficam
// aqui; o registro (lib/features.ts) referencia só a chave.
const ICONS: Record<IconKey, ReactNode> = {
  painel: I.painel,
  code: I.code,
  duelo: I.duelo,
  trofeu: I.trofeu,
  turma: I.turma,
  curso: I.curso,
  saep: I.saep,
  unity: I.unity,
  admin: I.admin,
};

// Constrói os grupos do menu a partir do registro central de features.
function buildGroups(isProf: boolean, isAdmin: boolean): Group[] {
  return getNavGroups(isProf, isAdmin).map((g) => ({
    title: g.title,
    items: g.items.map((f) => ({ href: f.href, label: f.label, icon: ICONS[f.icon] })),
  }));
}

function NavLinks({
  groups,
  pathname,
  onNavigate,
}: {
  groups: Group[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g.title} className="flex flex-col gap-1">
          <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {g.title}
          </span>
          {g.items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className={active ? "text-primary" : ""}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AppSidebar({
  isProf,
  isAdmin = false,
  footer,
}: {
  isProf: boolean;
  isAdmin?: boolean;
  footer: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = buildGroups(isProf, isAdmin);

  return (
    <>
      {/* Topbar mobile com botão de menu */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
        <Link href="/painel">
          <Logo />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="grid h-9 w-9 place-items-center rounded-lg border border-border"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
        </button>
      </div>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col gap-6 bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="grid h-8 w-8 place-items-center rounded-lg border border-border"
              >
                ✕
              </button>
            </div>
            <NavLinks groups={groups} pathname={pathname} onNavigate={() => setOpen(false)} />
            <div className="mt-auto">{footer}</div>
          </aside>
        </div>
      )}

      {/* Sidebar desktop fixa */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-border bg-card p-4 md:flex">
        <Link href="/painel" className="px-2 pt-1">
          <Logo />
        </Link>
        <NavLinks groups={groups} pathname={pathname} />
        <div className="mt-auto">{footer}</div>
      </aside>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/logo";
import { getNavGroups, type IconKey, type Role } from "@/lib/features";

type Item = { href: string; label: string; icon: ReactNode };
type Group = { title: string; items: Item[] };

// Ícones SVG inline (sem dependência). 18px, stroke currentColor.
const I = {
  painel: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>
  ),
  perfil: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M6.2 18.5a6 6 0 0 1 11.6 0" /></svg>
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
  relatorio: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><rect x="7" y="10" width="3" height="7" /><rect x="12" y="6" width="3" height="11" /><rect x="17" y="13" width="3" height="4" /></svg>
  ),
  config: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>
  ),
  sala: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v16" /><path d="M3 21h18M9 21v-6h6v6" /><path d="M7 7h2M15 7h2M7 11h2M15 11h2" /></svg>
  ),
  coordenacao: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3" /><path d="M5.5 21a6.5 6.5 0 0 1 13 0" /><path d="M12 2v2M12 11v2" /></svg>
  ),
};

// Mapa de IconKey (registro de features) -> SVG. Ícones são JSX, então ficam
// aqui; o registro (lib/features.ts) referencia só a chave.
const ICONS: Record<IconKey, ReactNode> = {
  painel: I.painel,
  perfil: I.perfil,
  code: I.code,
  duelo: I.duelo,
  trofeu: I.trofeu,
  turma: I.turma,
  curso: I.curso,
  saep: I.saep,
  unity: I.unity,
  admin: I.admin,
  relatorio: I.relatorio,
  config: I.config,
  sala: I.sala,
  coordenacao: I.coordenacao,
};

// Constrói os grupos do menu a partir do registro central de features.
function buildGroups(role: Role): Group[] {
  return getNavGroups(role).map((g) => ({
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
  role,
  footer,
}: {
  role: Role;
  footer: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = buildGroups(role);

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
